// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, Modifiers, GlobalShortcutExt};
use tauri_plugin_autostart::ManagerExt;

const WINDOW: &str = "launcher";

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// fn toggle_launchbar(app_handle: &tauri::AppHandle) {
//     let window = app_handle.get_window("main").expect("Window not found");
//     if window.is_visible().unwrap() {
//         window.hide().unwrap();
//     } else {
//         window.show().unwrap();
//     }
// }

// fn main() {
//     tauri::Builder::default()
//         .setup(|app| {
//             use tauri::Manager;
//             use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

//             let app_handle = app.handle();
//             let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyB);

//             app_handle.global_shortcut().register(shortcut, move || {
//                 toggle_launchbar(&app_handle);
//             }).expect("Failed to register global shortcut");

//             Ok(())
//         })
//         .plugin(tauri_plugin_global_shortcut::Builder::new().build())
//         .invoke_handler(tauri::generate_handler![greet])
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }

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
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::with_handler(|app_handle, shortcut| {
                // Low effor solution. I'm sure there's a nicer way.
                if shortcut.matches(Modifiers::CONTROL, Code::KeyE) {
                    // do something
                    toggle_launchbar(app_handle);
                }
            })
            .build(),
        )
        .setup(|app| {
            app.handle()
                .autolaunch()
                .enable()
                .expect("app should enable autostart");

            let global_shortcut = app.handle().global_shortcut();
            global_shortcut
                .register("CmdOrControl+E")
                .expect("app should register cmd+E hotkey");

            Ok(())
        })
        // .setup(|app| {
        //     #[cfg(desktop)]
        //     {
        //         app.handle().plugin(
        //             tauri_plugin_global_shortcut::Builder::new()
        //                 .with_shortcuts(["ctrl+d", "alt+space"])?
        //                 .with_handler(|app, shortcut, event| {
        //                     if event.state == ShortcutState::Pressed  {
        //                         if shortcut.matches(Modifiers::CONTROL, Code::KeyD) {
        //                             toggle_launchbar(app);
        //                         }
        //                         if shortcut.matches(Modifiers::ALT, Code::Space) {
        //                             let _ = app.emit("shortcut-event", "Alt+Space triggered");
        //                         }
        //                     }
        //                 })
        //                 .build(),
        //         )?;
        //     }

        //     Ok(())
        // })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
// fn main() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_global_shortcut::Builder::new().build())
//         .plugin(tauri_plugin_shell::init())
//         .invoke_handler(tauri::generate_handler![greet])
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }
