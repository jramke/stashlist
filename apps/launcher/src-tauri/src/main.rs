// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use tauri_plugin_global_shortcut::{Shortcut, Code, Modifiers, GlobalShortcutExt};
use argon2::{hash_raw, Config, Variant, Version};
use serde_json::Value;
use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

const WINDOW: &str = "main";

#[tauri::command]
fn get_env(name: &str) -> String {
    std::env::var(String::from(name)).unwrap_or(String::from(""))
}

fn hide_launchbar(app: &AppHandle, window: &WebviewWindow) {
    let _ = app.emit("toggle-window-rust", "closed");
    let _ = window.hide();
}

fn show_launchbar(app: &AppHandle, window: &WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
    let _ = app.emit("toggle-window-rust", "opened");
}

fn toggle_launchbar(app: &AppHandle) {
    let window = app
        .get_webview_window(WINDOW)
        .expect("Did you label your window?");
    if let Ok(true) = window.is_visible() {
        hide_launchbar(app, &window);
    } else {
        show_launchbar(app, &window);
    }
}

fn main() {
    dotenv::dotenv().ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
                let config = Config {
                    lanes: 4,
                    mem_cost: 10_000,
                    time_cost: 10,
                    variant: Variant::Argon2id,
                    version: Version::Version13,
                    ..Default::default()
                };
                let salt_str = get_env("STRONGHOLD_SALT");
                let salt = salt_str.as_bytes();
                let key =
                    hash_raw(password.as_ref(), &salt, &config).expect("failed to hash password");

                key.to_vec()
            })
            .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcuts(["ctrl+shift+b"])?
                        .with_handler(|app, shortcut, event| {
                            if event.state == ShortcutState::Pressed {
                                let ctrl_shift = Modifiers::CONTROL.union(Modifiers::SHIFT);
                                // let meta_shift = Modifiers::META.union(Modifiers::SHIFT);
                                if shortcut.matches(ctrl_shift, Code::KeyB) {
                                    // println!("Ctrl-b Detected!");
                                    toggle_launchbar(app);
                                    // https://github.com/tauri-apps/tauri/issues/9296
                                }
                            }
                        })
                        .build(),
                )?;

                let app_handle = app.handle().clone();
                let main_window = app.get_webview_window(WINDOW).unwrap();
                let main_window_clone = main_window.clone(); // Clone main_window
                let _id = main_window.listen("toggle-window-svelte", move |event| {
                    let payload = event.payload();
                    let parsed_payload: Result<Value, _> = serde_json::from_str(payload);
                    if let Ok(value) = parsed_payload {
                        if let Some(action) = value.as_str() {
                            match action {
                                "close" => {
                                    hide_launchbar(&app_handle, &main_window_clone);
                                }
                                "open" => {
                                    show_launchbar(&app_handle, &main_window_clone);
                                }
                                _ => {}
                            }
                        }
                    } else {
                        println!("Failed to parse payload: {:?}", payload);
                    }
                });

                let autostart_manager = app.autolaunch();
                let _ = autostart_manager.enable();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_env])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
