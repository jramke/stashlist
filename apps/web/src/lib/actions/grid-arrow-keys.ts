import type { Action } from 'svelte/action';

type EventHandlers<T extends Event> = {
    [eventName: string]: (event: T) => void;
};

type GridArrowKeyHandlerParams = {
    selector?: string;
} | undefined;

const INIT_ATTRIBUTE = 'grid-arrow-keys-init';
class GridArrowKeyHandler {
    node: HTMLElement | HTMLDivElement;
    params: GridArrowKeyHandlerParams;
    grid: HTMLElement | null = null;
    gridItems: HTMLElement[] = [];
    maxRow: number = 0;
    maxCol: number = 0;
    events: EventHandlers<Event> = {};
    constructor(node: HTMLElement | HTMLDivElement, params: GridArrowKeyHandlerParams = {}) {
        this.node = node;
        this.params = params;

        this.grid = this.getGrid(node);
        if (!this.grid) {
            console.warn('No grid found in GridArrowKeyHandler');
            return;
        }
        if (this.grid.getAttribute(INIT_ATTRIBUTE) === 'true') return;

        this.gridItems = this.getGridItems();
        if (this.gridItems.length === 0) {
            console.warn('No grid items found in GridArrowKeyHandler');
            return;
        }

        this.calcRowsAndColumns(this.grid, this.gridItems);

        this.events = {
            resize: () => {
                this.calcRowsAndColumns(this.grid!, this.gridItems);
            },
            keydown: (e: Event) => {
                this.handleKeyDown(e as KeyboardEvent);
            }
        }
        
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if ((mutation.type === 'attributes' && mutation.attributeName === 'class') || this.wasNodesAddedOrRemoved(mutation.addedNodes) || this.wasNodesAddedOrRemoved(mutation.removedNodes)) {
                    this.gridItems = this.getGridItems();
                    this.calcRowsAndColumns(this.grid!, this.gridItems);
                }
            });
        })
        mutationObserver.observe(this.grid, { attributes: true, childList: true, subtree: true });
        window.addEventListener('resize', this.events.resize);
        document.addEventListener('keydown', this.events.keydown);

        this.grid.setAttribute(INIT_ATTRIBUTE, 'true');
    }
    getGrid(selfOrChild: HTMLElement): HTMLElement | null {
        if (selfOrChild.classList.contains('grid')) {
            return selfOrChild;
        }
        return selfOrChild.querySelector('.grid') || null;
    }
    getGridItems(): HTMLElement[] {
        if (!this.grid) return [];
        if (this.params?.selector) {
            return Array.from(this.grid.querySelectorAll(this.params.selector)) as HTMLElement[];
        }
        return Array.from(this.grid.children) as HTMLElement[];
    }
    handleKeyDown(event: KeyboardEvent) {
        const key = event.key;
                
        const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
        const isTargetAGridItem = Array.from(this.gridItems).includes(event.target as HTMLElement);
        if (!isArrowKey || (!isTargetAGridItem  && document.activeElement !== document.body)) return;
        
        event.preventDefault();
        
        const currentPosition = this.getCurrentRowAndColumn(event.target as HTMLElement);
        if (currentPosition.row === 0 && currentPosition.col === 0) {
            this.calcRowsAndColumns(this.grid!, this.gridItems);
            this.focusGridItem(1, 1, false);
            return;
        }

        if (key === 'ArrowUp') {
            this.handleArrowKey(currentPosition, 'row', -1);
        }
        if (key === 'ArrowDown') {
            this.handleArrowKey(currentPosition, 'row', 1);
        }
        if (key === 'ArrowLeft') {
            this.handleArrowKey(currentPosition, 'col', -1);
        }
        if (key === 'ArrowRight') {
            this.handleArrowKey(currentPosition, 'col', 1);
        }
        

    }
    handleArrowKey(currentPosition: { row: number, col: number }, positionToChange: 'row' | 'col', changeAmount: number) {
        let row = currentPosition.row;
        let col = currentPosition.col;

        if (positionToChange === 'row') row += changeAmount;
        if (positionToChange === 'col') col += changeAmount;

        if (col < 1) col = this.maxCol;
        if (col > this.maxCol) col = 1;
       
        if (row < 1)  row = this.maxRow;
        if (row > this.maxRow) row = 1;

        this.focusGridItem(row, col);
    }
    calcRowsAndColumns(grid: HTMLElement, gridItems: HTMLElement[]) {
        if (!grid || gridItems.length === 0) return;
        const columnsCSS = getComputedStyle(grid).gridTemplateColumns;
        const columnsCount = columnsCSS.split(" ").length;
        const rowsCount = Math.ceil(gridItems.length / columnsCount);
    
        this.maxRow = rowsCount;
        this.maxCol = columnsCount;
    
        let rowCurrentCount = 1;
        let colCurrentCount = 1;
    
        gridItems.forEach((item) => {
            if (colCurrentCount > columnsCount) {
                colCurrentCount = 1;
                rowCurrentCount++;
            }
    
            item.dataset.col = colCurrentCount.toString();
            item.dataset.row = rowCurrentCount.toString();

            item.tabIndex = 0;
    
            if (colCurrentCount <= columnsCount) {
                colCurrentCount++;
            }
        });
    }
    getCurrentRowAndColumn(target: HTMLElement): { row: number, col: number } {
        const row = parseInt(target?.dataset?.row || '0');
        const col = parseInt(target?.dataset?.col || '0');
        return { row, col };
    }
    focusGridItem(row: number, col: number, recursive = true) {
        if (!this.grid) return;
        let el = this.grid.querySelector(`[data-row="${row}"][data-col="${col}"]`) as HTMLElement | null;
        if (!el) {
            if (recursive) {
                this.focusGridItem(row, col - 1);
            } else {
                this.calcRowsAndColumns(this.grid, this.gridItems);
            }
            return;
        };
        el.focus();
    }
    wasNodesAddedOrRemoved(nodes: NodeList) {
        if (nodes.length === 0) return false;
        const elements = Array.from(nodes).filter((node) => (node as Element).tagName);
        if (elements.some((node) => (node as Element).matches(this.params?.selector || '*'))) {
            return true;
        }
        return false;
    }
    destroy() {
        document.removeEventListener('keydown', this.events.keydown);
        window.removeEventListener('resize', this.events.resize);
        this.grid?.removeAttribute(INIT_ATTRIBUTE);
        this.grid = null;
        this.gridItems = [];
    }
}
	
export const gridArrowKeys: Action<HTMLElement, GridArrowKeyHandlerParams> = (node, params) => {    
    const handler = new GridArrowKeyHandler(node, params);
    return {
        destroy() {
            handler.destroy();
        },
    };
};