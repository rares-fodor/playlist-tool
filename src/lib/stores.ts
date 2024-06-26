import { writable } from "svelte/store";

interface IState {
    open: boolean
    position: { top: number; left: number }
    index: number | null
}

export const dropdownStore = writable<IState>({
    open: false,
    position: { top: 0, left: 0 },
    index: null
})