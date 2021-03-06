//import SvelteGantt from './Grid.html';
//import moment from "../node_modules/moment/src/moment.js";
let startOfToday = moment().startOf('day');

const colors = ['blue','green','orange']

let generation = 0;
function generateData() {
	const data = {
		rows: [],
		tasks: [],
	}

	const ids = [ ...Array(1000).keys() ];
	shuffleArray(ids);

	for(let i = 0; i < 1000; i++) {

		let rand_bool = Math.random() < 0.2;


		data.rows.push({
			generation,
			id: i,
            label: 'Row #'+i,
            age: (Math.random() * 80) | 0,
			tasks: [],
			enableDragging: true,
			imageSrc: 'Content/joe.jpg',
			//contentHtml: '<s>Test</s>'
			//headerHtml: '<s>Test</s>'
			classes: rand_bool ? ['row-disabled'] : undefined,
			enableDragging: !rand_bool
		});

		let a = i % 2;
		rand_bool = Math.random() > 0.5;
	
		const rand_h = (Math.random() * 10) | 0
		const rand_d = (Math.random() * 5) | 0 + 1

		//if(i === 5)
		data.tasks.push({
			type: 'task',
			generation,
			id: ids[i],
			resourceId: i,
			label: 'Task #'+ids[i],
			from: startOfToday.clone().set({'hour': 7 + rand_h, 'minute': 0}),
			to: startOfToday.clone().set({'hour': 7 + rand_h + rand_d, 'minute': 0}),
			//amountDone: Math.floor(Math.random() * 100),
			classes: colors[(Math.random() * colors.length) | 0],
			//enableDragging: !rand_bool
			//h: Math.random() < 0.5
		});

		if(i === 3)
		data.tasks.push({
			type: 'milestone',
			id: 4321,
			from: startOfToday.clone().set({hour: 13, minute: 0}),
			resourceId: 2,
			enableDragging: true
		});

		// data.tasks.push({
		// 	generation,
		// 	id: i + 1000,
		// 	resourceId: i,
		// 	label: 'Task #'+ (i + 1000),
		// 	from: startOfToday.clone().set({'hour': 12 + 4*a, 'minute': 0}),
		// 	to: startOfToday.clone().set({'hour': 14 + 4*a, 'minute': 0}),
		// 	//amountDone: Math.floor(Math.random() * 100),
		// 	classes: rand_bool ? 'task-status-1' : '',
		// 	enableDragging: !rand_bool
		// 	//h: Math.random() < 0.5
		// });
	}

	generation += 1;
	
	/*for(let i = 0; i < 499; i++) {
		data.dependencies.push({
			id: i, 
			fromTask: i, 
			toTask: i+1 
		});
	}*/

	return data;
}

// var interval = setInterval(() => {
// 	var data = generateData();
// 	gantt.initTasks(data.tasks);
// }, 1000);


/*setInterval(() => {
	for(let i = 0; i < 500; i++){
		let t = data.rows[i].tasks[0];
		if(t.h){
			t.amountDone += 1;
		}
		else{
			t.amountDone -= 1;
		}
	
		if(t.amountDone == 0 || t.amountDone == 100){
			t.h = !t.h
		}	
		t.updateView();
	}
}, 50)*/

const currentStart = startOfToday.clone().set({hour: 6, minute: 0});
const currentEnd = startOfToday.clone().set({hour: 18, minute: 0});

let options = {
	//headers: [{unit: 'day', format: 'MMMM Do'}, {unit: 'hour', format: 'H:mm'}],
	stretchTimelineWidthToFit: true,
	from: currentStart,
	to: currentEnd,
	tableHeaders: [{title: 'Label', property: 'label', width: 140, type: 'resourceInfo'}, {title: 'Age', property: 'age', width: 140}],
	tableWidth: 140,
    modules: [SvelteGanttTable],
	//taskContent: (task) => '<i class="sg-icon fas fa-calendar"></i>' + task.model.label
}

var gantt = SvelteGantt.create(document.getElementById('example-gantt'), generateData(), options);

gantt.initTimeRanges([{
	id: 0, 
	from: startOfToday.clone().set({hour: 10, minute: 0}),
	to: startOfToday.clone().set({hour: 12, minute: 0}),
	classes: null,
	label: 'Lunch' //?
}]);

//gantt.api.tasks.on.move((task) => console.log('Listener: task move', task));
//gantt.api.tasks.on.switchRow((task, row, previousRow) => console.log('Listener: task switched row', task));
gantt.api.tasks.on.select((task) => console.log('Listener: task selected', task));
//gantt.api.tasks.on.moveEnd((task) => console.log('Listener: task move end', task));
gantt.api.tasks.on.changed((task) => console.log('Listener: task changed', task));





document.getElementById('setDayView').addEventListener('click', (event) => {
	console.log('day view set');
	gantt.updateView({
		stretchTimelineWidthToFit: true,
		columnUnit: 'minute',
		columnOffset: 15,
		from: currentStart,
		to: currentEnd,
		minWidth: 1000,
		headers: [{unit: 'day', format: 'DD.MM.YYYY'}, {unit: 'hour', format: 'HH'}]
	});
});

document.getElementById('setWeekView').addEventListener('click', (event) => {
	console.log('week view set');
	gantt.updateView({
		stretchTimelineWidthToFit: false,
		columnUnit: 'hour',
		columnOffset: 1,
		from: currentStart.clone().startOf('week'),
		to: currentStart.clone().endOf('week'),
		minWidth: 5000,
		headers: [{unit: 'month', format: 'MMMM YYYY'},{unit: 'day', format: 'ddd DD'}]
	});
});

document.getElementById('setNextDay').addEventListener('click', (event) => {
	currentStart.add(1, 'day');
	currentEnd.add(1, 'day');
	console.log('set next day');

	gantt.updateView({
		from: currentStart,
		to: currentEnd
	});
});


document.getElementById('setPreviousDay').addEventListener('click', (event) => {
	currentStart.subtract(1, 'day');
	currentEnd.subtract(1, 'day');
	console.log('set previous day');

	gantt.updateView({
		from: currentStart,
		to: currentEnd
	});
});

document.getElementById('reInit').addEventListener('click', (event) => {
	
	console.log('re init');
	const data = generateData();
	gantt.initRows(data.rows);
	gantt.initTasks(data.tasks);
});

SvelteGanttExternal.create(document.getElementById('newTask'), {
	gantt,
	onsuccess: (row, date, g) => {

        console.log(row.model.id, date.format())

		const task = g.taskFactory.createTask({
			id: 5000+Math.floor(Math.random() * 1000),
			label: 'Task #'+4343,
			from: date,
			to: date.clone().add(3, 'hour'),
			classes: colors[(Math.random() * colors.length) | 0],
            resourceId: row.model.id
        });
        
        gantt.store.addTask(task);
	}
});

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}