#!/usr/bin/env python3
"""Builds the Shortcut for iOS and macOS that stashes what the share sheet hands over.

Run on a Mac that is signed in to iCloud (signing is Apple's): python3 scripts/build-ios-shortcut.py
Signed, the file is public/stashlist.shortcut. Without iCloud it is storage/app/stashlist-unsigned.shortcut, which
only opens in Shortcuts on a Mac. The file holds no address and no token: Shortcuts asks for both when it is added.
"""

import plistlib
import subprocess
import tempfile
import uuid
from pathlib import Path

OBJ = "￼"  # where a variable sits inside a text


def new_id() -> str:
    return str(uuid.uuid4()).upper()


def attachment(output_uuid: str, output_name: str) -> dict:
    return {"Type": "ActionOutput", "OutputName": output_name, "OutputUUID": output_uuid}


def token_string(text: str, **variables: tuple[str, str]) -> dict:
    """A text with variables: `{name}` in text marks where each goes, given as name=(uuid, output name)."""
    plain, ranges = "", {}
    for part in text.replace("{", "\x00{").split("\x00"):
        name = part[1 : part.index("}")] if part.startswith("{") else None
        if name is None:
            plain += part
            continue
        ranges[f"{{{len(plain)}, 1}}"] = attachment(*variables[name])
        plain += OBJ + part[part.index("}") + 1 :]
    value = {"string": plain}
    if ranges:
        value["attachmentsByRange"] = ranges
    return {"Value": value, "WFSerializationType": "WFTextTokenString"}


def dictionary(items: dict[str, dict]) -> dict:
    return {
        "Value": {
            "WFDictionaryFieldValueItems": [
                {"WFItemType": 0, "WFKey": token_string(key), "WFValue": value} for key, value in items.items()
            ]
        },
        "WFSerializationType": "WFDictionaryFieldValue",
    }


def action(identifier: str, **parameters) -> dict:
    return {"WFWorkflowActionIdentifier": f"is.workflow.actions.{identifier}", "WFWorkflowActionParameters": parameters}


address_id, token_id, links_id, post_id, dict_id, key_id, group = (new_id() for _ in range(7))

actions = [
    # 0 and 1: the two things Shortcuts asks for when the shortcut is added.
    action("gettext", WFTextActionText="https://", UUID=address_id),
    action("gettext", WFTextActionText="", UUID=token_id),
    action(
        "detect.link",
        UUID=links_id,
        WFInput={"Value": {"Type": "ExtensionInput"}, "WFSerializationType": "WFTextTokenAttachment"},
    ),
    action(
        "downloadurl",
        UUID=post_id,
        WFURL=token_string("{address}/api/v1/stashes", address=(address_id, "Text")),
        WFHTTPMethod="POST",
        WFHTTPBodyType="JSON",
        ShowHeaders=True,
        WFHTTPHeaders=dictionary(
            {
                "Authorization": token_string("Bearer {token}", token=(token_id, "Text")),
                "Accept": token_string("application/json"),
            }
        ),
        WFJSONValues=dictionary({"url": token_string("{link}", link=(links_id, "URLs"))}),
    ),
    action("detect.dictionary", UUID=dict_id),
    action(
        "getvalueforkey",
        UUID=key_id,
        WFDictionaryKey="id",
        WFGetDictionaryValueType="Value",
    ),
    action(
        "conditional",
        GroupingIdentifier=group,
        WFControlFlowMode=0,
        WFCondition="Has Any Value",
        WFInput={
            "Type": "Variable",
            "Variable": {"Value": attachment(key_id, "Dictionary Value"), "WFSerializationType": "WFTextTokenAttachment"},
        },
    ),
    action("notification", WFNotificationActionTitle="Stashlist", WFNotificationActionBody="Stashed."),
    action("conditional", GroupingIdentifier=group, WFControlFlowMode=1),
    action(
        "notification",
        WFNotificationActionTitle="Stashlist",
        WFNotificationActionBody="Could not stash. Check the address and the token.",
    ),
    action("conditional", GroupingIdentifier=group, WFControlFlowMode=2, UUID=new_id()),
]

shortcut = {
    "WFWorkflowActions": actions,
    "WFWorkflowClientVersion": "2900",
    "WFWorkflowMinimumClientVersion": 900,
    "WFWorkflowMinimumClientVersionString": "900",
    "WFWorkflowHasShortcutInputVariables": True,
    "WFWorkflowIcon": {"WFWorkflowIconStartColor": 463140863, "WFWorkflowIconGlyphNumber": 59511},
    "WFWorkflowInputContentItemClasses": [
        "WFURLContentItem",
        "WFSafariWebPageContentItem",
        "WFArticleContentItem",
        "WFStringContentItem",
        "WFRichTextContentItem",
    ],
    "WFWorkflowTypes": ["ActionExtension"],
    "WFWorkflowImportQuestions": [
        {
            "Category": "Parameter",
            "ParameterKey": "WFTextActionText",
            "ActionIndex": 0,
            "Text": "The address of your Stashlist, for example https://stashlist.example",
            "DefaultValue": "https://",
        },
        {
            "Category": "Parameter",
            "ParameterKey": "WFTextActionText",
            "ActionIndex": 1,
            "Text": "An API token, made under Settings, API tokens",
            "DefaultValue": "",
        },
    ],
}

root = Path(__file__).resolve().parent.parent
target = root / "public" / "stashlist.shortcut"
data = plistlib.dumps(shortcut, fmt=plistlib.FMT_BINARY)
with tempfile.TemporaryDirectory() as tmp:
    unsigned = Path(tmp) / "unsigned.shortcut"
    unsigned.write_bytes(data)
    signed = subprocess.run(
        ["shortcuts", "sign", "--mode", "anyone", "--input", str(unsigned), "--output", str(target)],
        capture_output=True,
        text=True,
    )
    if signed.returncode != 0:
        # Signing needs a Mac that is signed in to iCloud. An unsigned file still opens in Shortcuts on a Mac;
        # an iPhone only takes it after it was shared from there (iCloud link) or signed.
        print("not signed:", signed.stderr.strip())
        target = root / "storage" / "app" / "stashlist-unsigned.shortcut"
        target.write_bytes(data)
print(f"wrote {target} ({target.stat().st_size} bytes)")
