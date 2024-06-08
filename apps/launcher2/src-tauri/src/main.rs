// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use tauri_plugin_global_shortcut::{Shortcut, Code, Modifiers, GlobalShortcutExt};
// use tauri::{Manager, AppHandle};

use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

// const WINDOW: &str = "launcher";

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    println!("hi from greet");
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// fn toggle_launchbar(app: &AppHandle) {
//     let window = app.get_webview_window(WINDOW).expect("Did you label your window?");
//     if let Ok(true) = window.is_visible() {
//         let _ = window.hide();
//     } else {
//         let _ = window.show();
//     }
// }

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            #[cfg(desktop)]
            {
                // use tauri::Manager;
                // use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

                println!("Setting up global shortcut");
                // let test_shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyB);
                app.handle().plugin(
                    // tauri_plugin_global_shortcut::Builder::with_handler(|app, shortcut, event| {
                    //     println!("{:?}", shortcut);
                    //     if event.state == ShortcutState::Pressed  {
                    //         if shortcut.matches(Modifiers::CONTROL, Code::KeyB) {
                    //             println!("Ctrl-B Detected!");
                    //             // toggle_launchbar(app);
                    //         }
                    //     }
                    // })
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcuts(["ctrl+b", "alt+space"])?
                        .with_handler(|app, shortcut, event| {
                            println!("im here");
                            if event.state == ShortcutState::Pressed {
                                if shortcut.matches(Modifiers::CONTROL, Code::KeyD) {
                                    println!("Ctrl-d Detected!");
                                    let _ = app.emit("shortcut-event", "Ctrl+d triggered");
                                    // toggle_launchbar(app);
                                }
                                if shortcut.matches(Modifiers::ALT, Code::Space) {
                                    let _ = app.emit("shortcut-event", "Alt+Space triggered");
                                }
                            }
                        })
                        .build(),
                )?;

                // let ctrl_n_shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyN);
                // let handle = app.handle().clone();
                // app.handle().plugin(
                //     tauri_plugin_global_shortcut::Builder::with_handler(|app, shortcut, event| {
                //         println!("{:?}", shortcut);
                //         if shortcut == &ctrl_n_shortcut {
                //             println!("Ctrl-N Detected!");
                //             // handle.emit("new", "").unwrap()
                //             // app.emit_to(EventTarget::any(), "new",  "").unwrap()
                //         }
                //     })
                //     .build(),
                // )?;

                // app.global_shortcut().register(ctrl_n_shortcut)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
