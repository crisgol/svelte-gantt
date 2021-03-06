import { Store } from 'svelte/store';
import { SvelteTask } from './task';
import { SvelteRow } from './row';
import { SvelteTimeRange } from './timeRange';

export class GanttStore extends Store {

    constructor(data){
        super(Object.assign({
            taskIds: [],
            taskMap: {},
            rowIds: [],
            rowMap: {},
            timeRangeMap: {},
            columns: []
        }, data),{ 
            immutable: !true 
        });

        this.compute('allTasks', ['taskIds', 'taskMap'], (ids: string[], entities: {[key:string]:any}) => {
            return ids.map(id => entities[id]);
        });
        this.compute('allRows', ['rowIds', 'rowMap'], (ids: string[], entities: {[key:string]:any}) => {
            return ids.map(id => entities[id]);
        });
    }

    addTask(task: SvelteTask) {
        const { taskIds, taskMap } = this.get();
        const newState = add(task, {ids: taskIds, entities: taskMap});
        this.set({taskIds: newState.ids, taskMap: newState.entities});
    }

    addAllTask(tasks: SvelteTask[]) {
        const newState = addAll(tasks);
        this.set({taskIds: newState.ids, taskMap: newState.entities});
    }

    addAllRow(rows: SvelteRow[]) {
        const newState = addAll(rows);
        this.set({rowIds: newState.ids, rowMap: newState.entities});
    }

    addRow(row: SvelteRow) {
        const { rowIds, rowMap } = this.get();
        const newState = add(row, {ids: rowIds, entities: rowMap});
        this.set({rowIds: newState.ids, rowMap: newState.entities});
    }

    updateTask(task: SvelteTask) {
        const { taskMap } = this.get();
        this.set({taskMap: update(task, {entities: taskMap}).entities});
    }

    updateRow(row: SvelteRow) {
        const { rowMap } = this.get();
        this.set({rowMap: update(row, {entities: rowMap})});
    }


    addTimeRange(timeRange: SvelteTimeRange) {
        const { timeRangeMap } = this.get();
        const newState = add(timeRange, {ids: [], entities: timeRangeMap});
        this.set({timeRangeMap: newState.entities});
    }

    updateTimeRange(timeRange: SvelteTimeRange) {
        const { timeRangeMap } = this.get();
        const n = update(timeRange, {entities: timeRangeMap})
        this.set({timeRangeMap: n.entities});
    }
}

interface EntityState {
    ids?: number[], 
    entities: any
}

function add(entity, state: EntityState) {
    return {
        ids: [ ...state.ids, entity.model.id ],
        entities: {
            ...state.entities,
            [entity.model.id]: entity
        }
    };
}

function addMany(entities, state: EntityState) {

    for(const entity of entities) {
        state.ids.push(entity.model.id);
        state.entities[entity.model.id] = entity;
    }

    return {
        ids: state.ids.map(i => i),
        entities: state.entities
    }
}
function addAll(entities) {
    const ids = [];
    const newEntities = {};

    for(const entity of entities) {
        ids.push(entity.model.id);
        newEntities[entity.model.id] = entity;
    }

    return {
        ids: ids,
        entities: newEntities
    }
}

function update(entity, state: EntityState){
    return {
        entities: {
            ...state.entities,
            [entity.model.id]: entity
        }
    };
}

// add(entity){
//     const { ids, entities } = this.get();
//     this.set({
//         ids: [ ...ids, entity.id ],
//         entities: {
//             ...entities,
//             [entity.id]: entity
//         }
//     });
// }

// addMany(entityArr){
//     const { entities } = this.get();
//     const newEntities = {
//         ...entities,
//         ...entityArr
//     }

//     this.set({
//         ids: Object.keys(newEntities),
//         entities: newEntities
//     });
// }

// update(entity){
//     const { entities } = this.get();
//     this.set({
//         entities: {
//             ...entities,
//             [entity.id]: entity
//         }
//     });
// }

// remove(id){
//     const { ids, entities } = this.get();
//     const { [id]: entity, ...newEntities } = entities;
//     this.set({
//         ids: ids.filter(i => i === id),
//         entities: newEntities
//     });
// }