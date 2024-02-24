<!-- https://github.com/agustinl/svelte-tags-input -->
<script>
    import { cn } from '$ui/utils';
	import { Badge } from '$ui/components/ui/badge';

    let tag = "";
    let arrelementsmatch = [];
    let autoCompleteIndex = -1;
    
    let regExpEscape = (s) => {
      return s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&")
    }
    
    export let tags;
    export let addKeys;
    export let maxTags;
    export let onlyUnique;
    export let removeKeys;
    export let placeholder;
    export let allowPaste;
    export let allowDrop;
    export let splitWith;
    export let autoComplete;
    export let autoCompleteFilter;
    export let autoCompleteKey;
    export let autoCompleteMarkupKey;
    export let name;
    export let id;
    export let allowBlur;
    export let disable;
    export let minChars;
    export let onlyAutocomplete;
    export let labelText;
    export let labelShow;
    export let readonly;
    export let onTagClick;
    export let autoCompleteShowKey;
    export let autoCompleteAddKey;
    export let onTagAdded;
    export let onTagRemoved;
    export let cleanOnBlur;
    export let customValidation;
    
    let layoutElement;
    
    $: tags = tags || [];
    $: addKeys = addKeys || [13];
    $: maxTags = maxTags || false;
    $: onlyUnique = onlyUnique || false;
    $: removeKeys = removeKeys || [8];
    $: placeholder = placeholder || "";
    $: allowPaste = allowPaste || false;
    $: allowDrop = allowDrop || false;
    $: splitWith = splitWith || ",";
    $: autoComplete = autoComplete || false;
    $: autoCompleteFilter = typeof autoCompleteFilter == "undefined" ? true : false;
    $: autoCompleteKey = autoCompleteKey || false;
    $: autoCompleteMarkupKey = autoCompleteMarkupKey || false;
    $: name = name || "svelte-tags-input";
    $: id = id || uniqueID();
    $: allowBlur = allowBlur || false;
    $: disable = disable || false;
    $: minChars = minChars ?? 1;
    $: onlyAutocomplete = onlyAutocomplete || false;
    $: labelText = labelText || name;
    $: labelShow = labelShow || false;
    $: readonly = readonly || false;
    $: onTagClick = onTagClick || function(){};
    $: autoCompleteShowKey = autoCompleteShowKey || autoCompleteKey;
    $: autoCompleteAddKey = autoCompleteAddKey || autoCompleteKey;
    $: onTagAdded = onTagAdded || function(){};
    $: onTagRemoved = onTagRemoved || function(){};
    $: cleanOnBlur = cleanOnBlur || false;
    $: customValidation = customValidation || false;
    
    
    $: matchsID = id + "_matchs";
    
    let storePlaceholder = placeholder;
    
    function setTag(e) {
        const currentTag = e.target.value;
        
        
        if (addKeys) {
            addKeys.forEach(function(key) {
                if (key === e.keyCode) {
                    
                    // prevent form submits on enter when input is focused and there is also no text written in the input
                    if (currentTag || currentTag === '') e.preventDefault();
                                    
                    /* switch (input.keyCode) {
                    case 9:
                        // TAB add first element on the autoComplete list
                        if (autoComplete && document.getElementById(matchsID)) {                        
                            addTag(document.getElementById(matchsID).querySelectorAll("li")[0].textContent);
                        } else {
                            addTag(currentTag);
                        }                    
                        break;
                    default:
                        addTag(currentTag);
                        break;
                    } */
    
                    /*
                     * Fix https://github.com/agustinl/svelte-tags-input/issues/87
                     * If autocomplete = true
                     * If onlyAutocomplete = true: You cannot add random tags
                     * If input element with ID
                     */
                    if (minChars === 0) {
                        addTag(arrelementsmatch?.[autoCompleteIndex]?.label);
                    } else {
                        if (autoComplete && onlyAutocomplete) {
                            addTag(arrelementsmatch?.[autoCompleteIndex]?.label);
                        } else {
                            addTag(currentTag);
                        }
                    }
                }
            });
        }
        
        if (removeKeys) {
            removeKeys.forEach(function(key) {
                if (key === e.keyCode && tag === "") {
                    tags.pop();  
                    tags = tags;
    
                    arrelementsmatch = [];
                    document.getElementById(id).readOnly = false;
                    placeholder = storePlaceholder;
                    document.getElementById(id).focus();
                }
            });
        }
        
        // ArrowDown : focus on first element of the autocomplete
        // if (e.keyCode === 40 && autoComplete && document.getElementById(matchsID)) {
        //remove the check for the element in the dom, so it also can be used inside the shadowdowm from the extension
        if (e.keyCode === 40 && autoComplete) {
            // Last element on the list ? Go to the first
            if (autoCompleteIndex + 1 === arrelementsmatch.length) autoCompleteIndex = 0
            else autoCompleteIndex++
        } else if (e.keyCode === 38) {
            // ArrowUp
            // First element on the list ? Go to the last
            if (autoCompleteIndex <= 0) autoCompleteIndex = arrelementsmatch.length - 1
            else autoCompleteIndex--
        } else if (e.keyCode === 27) {
            // Escape
            arrelementsmatch = [];
            document.getElementById(id).focus();
        }
    
    }
    
    function addTag(currentTag) {
    
        if (typeof currentTag === 'object' && currentTag !== null) {
            if (!autoCompleteKey) {
                return console.error("'autoCompleteKey' is necessary if 'autoComplete' result is an array of objects");
            }
            
            if (onlyUnique) {
                let found = tags?.find(elem => elem[autoCompleteKey] === currentTag[autoCompleteKey]);
            
                if (found) return;
            }
    
            var currentObjTags = currentTag;
            currentTag = currentTag[autoCompleteKey].trim();
    
        } else {
            currentTag = currentTag.trim();
        }
        
        if (currentTag == "") return;
        if (maxTags && tags.length == maxTags) return;
        if (onlyUnique && tags.includes(currentTag)) return;
        if (onlyAutocomplete && arrelementsmatch.length === 0) return;
    
        if (customValidation && !customValidation(currentTag)) return;
        
        const tagToPush = currentObjTags ? currentObjTags : currentTag

        // if (autoCompleteAddKey) {
        //     if (!tagToPush[autoCompleteAddKey]) {
        //         return console.error(`The 'autoCompleteAddKey': ${autoCompleteAddKey} is not found on the object`);
        //     }
        //     if (autoCompleteShowKey !== autoCompleteAddKey) {
        //         if (!tagToPush[autoCompleteShowKey]) {
        //             return console.error(`The 'autoCompleteAddKey': ${autoCompleteAddKey} is not found on the object`);
        //         }
        //         tags.push({
        //             [autoCompleteAddKey]: tagToPush[autoCompleteAddKey],
        //             [autoCompleteShowKey]: tagToPush[autoCompleteShowKey],
        //         })
        //     } else {
        //         tags.push(tagToPush[autoCompleteAddKey])
        //     }
        // } else {
        //     tags.push(tagToPush)
        // }
        tags.push(tagToPush)

        tags = tags;
        tag = "";
        
        onTagAdded(currentTag, tags)
        
        // Hide autocomplete list
        // Focus on svelte tags input
        arrelementsmatch = [];
        autoCompleteIndex = -1;
        document.getElementById(id)?.focus();
    
        if (maxTags && tags.length == maxTags) {
            document.getElementById(id).readOnly = true;
            placeholder = "";
        };
    
    }
    
    function removeTag(i) {
    
        tags.splice(i, 1);
        onTagRemoved(tags[i], tags);
        tags = tags;
        
        // Hide autocomplete list
        // Focus on svelte tags input
        arrelementsmatch = [];
        document.getElementById(id).readOnly = false;
        placeholder = storePlaceholder;
        document.getElementById(id).focus();
    
    }
    
    function onPaste(e) {
    
        if(!allowPaste) return;
        e.preventDefault();
    
        const data = getClipboardData(e);
        splitTags(data).map(tag => addTag(tag));    
    }
    
    function onDrop(e) {
    
        if(!allowDrop) return;
        e.preventDefault();
    
        const data = e.dataTransfer.getData("Text");
        splitTags(data).map(tag => addTag(tag));
    }
    
    function onFocus() {
        layoutElement.classList.add('focus');
    }
    
    function onBlur(e, currentTag) {
        layoutElement.classList.remove('focus');
    
        if (allowBlur) {
            // A match is highlighted
            if (arrelementsmatch.length && autoCompleteIndex > -1) {
                addTag(arrelementsmatch?.[autoCompleteIndex]?.label)
            }
            // There is no match, but we may add a new tag
            else if (!arrelementsmatch.length) {
                e.preventDefault()
                addTag(currentTag)
            }
        }
    
        // Clean input on
        if (cleanOnBlur) {
            tag = "";
        }
    
        arrelementsmatch = []
        autoCompleteIndex = -1
    }
    
    function onClick() {
        minChars == 0 && getMatchElements();
    }
    
    function getClipboardData(e) {
    
        if (window.clipboardData) {
            return window.clipboardData.getData('Text')
        }
    
        if (e.clipboardData) {
            return e.clipboardData.getData('text/plain')
        }
    
        return ''
    }
    
    function splitTags(data) {
        return data.split(splitWith).map(tag => tag.trim());    
    }
    
    function escapeHTML(string) {
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return ('' + string).replace(/[&<>"'\/]/g, match => htmlEscapes[match]);
    }
    
    function buildMatchMarkup(search, value) {
        return escapeHTML(value).replace(RegExp(regExpEscape(search.toLowerCase()), 'i'), "<strong>$&</strong>")
    }
    
    async function getMatchElements(input) {
    
        if (!autoComplete) return;
        if (maxTags && tags.length >= maxTags) return;
        
        let value = input ? input.target.value : "";
        let autoCompleteValues = [];
        
        if (Array.isArray(autoComplete)) {
            autoCompleteValues = autoComplete
        }
                
        if (typeof autoComplete === 'function') {
            if(autoComplete.constructor.name === 'AsyncFunction') {
                autoCompleteValues = await autoComplete(value)
            } else {
                autoCompleteValues = autoComplete(value)
            }
        }
    
        if(autoCompleteValues.constructor.name === 'Promise') {
            autoCompleteValues = await autoCompleteValues;
        }
        // Escape
        if ((minChars > 0 && value == "") || (input && input.keyCode === 27) || value.length < minChars ) {
            arrelementsmatch = [];
            return;
        }
    
        let matchs = autoCompleteValues;
        
        if (typeof autoCompleteValues[0] === 'object' && autoCompleteValues !== null) {
            
            if (!autoCompleteKey) {
                return console.error("'autoCompleteValue' is necessary if 'autoComplete' result is an array of objects");
            }
    
            if(autoCompleteFilter !== false) {
                matchs = autoCompleteValues.filter(e => e[autoCompleteKey].toLowerCase().includes(value.toLowerCase()))
            }
            matchs = matchs.map(matchTag => {
                return {
                    label: matchTag,
                    search: autoCompleteMarkupKey ? matchTag[autoCompleteMarkupKey] : buildMatchMarkup(value, matchTag[autoCompleteKey])
                }
            });
    
    
        } else {
            if(autoCompleteFilter !== false) {
                matchs = autoCompleteValues.filter(e => e.toLowerCase().includes(value.toLowerCase()))
            }
            matchs = matchs.map(matchTag => {
                return {
                    label: matchTag,
                    search: buildMatchMarkup(value, matchTag)
                }
            });
        }
    
        if (onlyUnique === true && !autoCompleteKey) {
            matchs = matchs.filter(tag => !tags.includes(tag.label));
        }
    
        arrelementsmatch = matchs;
    }
    
    function uniqueID() {
        return 'sti_' + Math.random().toString(36).substring(2, 11);
    };
    
</script>

<div 
    class={cn(
        "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disable || readonly ? 'cursor-not-allowed opacity-50 pointer-events-none' : ''
    )} 
    bind:this={layoutElement}>

    {#if tags.length > 0}
        {#each tags as tag, i}
        <Badge type="button" class="whitespace-nowrap me-2" on:click={onTagClick(tag)}>
            {#if typeof tag === 'string'}
                {tag}
            {:else}
                {tag[autoCompleteShowKey]}
            {/if}
            {#if !disable && !readonly}
                <button type="button" class="ms-1 mb-[3px]" on:pointerdown={() => removeTag(i)} on:keydown|preventDefault={() => removeTag(i)}>&#215;</button>
            {/if}   
        </Badge>
        {/each}
    {/if}
    <input
        type="text"
        id={id}
        name={name}
        bind:value={tag}
        on:keydown={setTag}
        on:keyup={getMatchElements}
        on:paste={onPaste}
        on:drop={onDrop}
        on:focus={onFocus}
        on:blur={(e) => onBlur(e, tag)}
        on:pointerdown={onClick}
        class="bg-transparent w-full placeholder:text-muted-foreground focus-visible:outline-none"
        placeholder={placeholder}
        disabled={disable || readonly}
        autocomplete="off"
    />
</div>

{#if autoComplete && arrelementsmatch.length > 0}
    <div class="relative w-full">
        <ul id="{id}_matchs" class="absolute w-full p-1 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
            {#each arrelementsmatch as element, index}
                <li
                    class="border border-transparent 
                        relative flex w-full cursor-pointer select-none rounded-sm text-sm outline-none 
                        data-[disabled]:pointer-events-none data-[disabled]:opacity-50 
                        hover:bg-secondary [&.focus]:bg-secondary hover:text-accent-foreground [&.focus]:text-accent-foreground hover:shadow-inner [&.focus]:shadow-inner hover:shadow-primary/20 [&.focus]:shadow-primary/20 hover:border-primary [&.focus]:border-primary"
                    class:focus={index === autoCompleteIndex}>
                    <button type="button" class="py-1.5 pl-8 pr-2 text-left w-full" on:pointerdown|preventDefault={() => addTag(element.label)} on:keydown|preventDefault={() => addTag(element.label)}>
                        {@html element.search}
                    </button>
                </li>
            {/each}
        </ul>
    </div>
{/if}
