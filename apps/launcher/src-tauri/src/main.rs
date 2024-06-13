// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use tauri_plugin_global_shortcut::{Shortcut, Code, Modifiers, GlobalShortcutExt};
use serde_json::Value;
use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

const WINDOW: &str = "main";

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    println!("hi from greet");
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn hide_launchbar(app: &AppHandle, window: &WebviewWindow) {
    let _ = window.hide();
    let _ = app.emit("toggle-window-rust", "closed");
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
    tauri::Builder::default()
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
                                    println!("Ctrl-b Detected!");
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
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
