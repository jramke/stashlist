// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, AppHandle};
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

const WINDOW: &str = "launcher";

fn toggle_launchbar(app: &AppHandle) {
    let window = app.get_webview_window(WINDOW).expect("Did you label your window?");
    if let Ok(true) = window.is_visible() {
        let _ = window.hide();
    } else {
        let _ = window.show();
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            {
                println!("Setting up global shortcut"); // is printed out
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcuts(["ctrl+d", "alt+space"])?
                        .with_handler(|app, shortcut, event| {
                            println!("im here"); // not here
                            if event.state == ShortcutState::Pressed  {
                                if shortcut.matches(Modifiers::CONTROL, Code::KeyD) {
                                    println!("Ctrl+D triggered");
                                    let _ = app.emit("shortcut-event", "Ctrl+D triggered");
                                    toggle_launchbar(app);
                                }
                                if shortcut.matches(Modifiers::ALT, Code::Space) {
                                    println!("Alt+Space triggered");
                                    let _ = app.emit("shortcut-event", "Alt+Space triggered");
                                }
                            }
                        })
                        .build(),
                )?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
