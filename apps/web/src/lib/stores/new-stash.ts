import { get, writable } from "svelte/store";
import { commandMenuOpen } from ".";

const newStashInput = writable<HTMLInputElement | null>(null);

type NewStashStore = {
    focusNewStashInput: typeof focusNewStashInput;
    setNewStashInput: typeof setNewStashInput;
    newStashInput: typeof newStashInput;
};

function setNewStashInput(input: HTMLInputElement) {
    newStashInput.set(input);
}

function focusNewStashInput() {
    const focusIt = () => {
        newStashInput.update($input => {
            $input?.focus();
            return $input;
        });
    }
    if (get(commandMenuOpen) === true) {
        commandMenuOpen.set(false);
        setTimeout(focusIt, 250); // need to wait for the menu to close, because it blurs the focus on close
    } else {
        focusIt();
    }
}

export const newStashStore: NewStashStore = {
    focusNewStashInput,
    setNewStashInput,
    newStashInput,
};