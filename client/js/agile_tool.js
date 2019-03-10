//TODO:
    //build sprint selecter
        //build sprint feedback
    //export data to file
        //create export data button
        //convert data in table to .csv or json file potentially
    //build burndown chart
        //include chartjs
        //extract data from table
        //decide what type of graph to do
        //display data on graph
    //build submission frequency chart
        //extract submitted date data from table for each task
        //build bar chart showing submission data for each day of the week
    //build group member task counter  
        //extra task count from table for each user
    //style

//fetch an element

function countCompletedTasks() {
    //find all the tasks that have been completed
    var completed = 0;
    var children = document.querySelector('#task-table').querySelectorAll('tr');
    var childrenList = Array.from(children); //make an array from the children
    childrenList.forEach(element => {
        if(element.children[0].textContent.toLowerCase().includes('completed')) {
            completed++;
        }
    })
    return completed;
}

function updateProgress() {
    var TASKS = $('#task-table').find('tr').length - 2;
    var $PROGRESS_BAR = $('#progress-bar');

    if(TASKS != 0) {
        $PROGRESS_BAR.stop();

        var COMPLETED_TASKS = countCompletedTasks();
        var width = $PROGRESS_BAR.width() / $PROGRESS_BAR.parent().width() * 100;
        var target_width = COMPLETED_TASKS / TASKS * 100 ;
        
        if(TASKS == COMPLETED_TASKS) {
            $('#tasks-tooltip').text('You have completed all of your tasks!');
        } else {
            $('#tasks-tooltip').text("You have completed " + COMPLETED_TASKS + " out of " + TASKS + " tasks.");
        }

        if(width > target_width) {
            $PROGRESS_BAR.animate({
                width: '-=' + (width - target_width) + '%'
            }, 2000)
        } else if(width < target_width) {
            $PROGRESS_BAR.animate({
                width: '+=' + (target_width - width) + '%'
            }, 2000)
        }
    } else {
        $('#tasks-tooltip').text('You do not have any tasks to completed');
    }
    
}

function checkSubmissionDate($submitted, $deadline, $parent) {
    var submitted_date = new Date(parseInt($submitted.attr('date-submitted'))).toLocaleDateString();
    var deadline_date = new Date($deadline.val()).toLocaleDateString();

    $parent.removeClass('in-progress');

    //check if the submission date is equal to the deadline 
    if(submitted_date === deadline_date) {
        //task was submitted on time
        $parent.find('#status').text('completed');
        $parent.addClass('confirmed');
    } else if(submitted_date < deadline_date) {
        //task was submitted before deadline
        $parent.find('#status').text('completed (early)');
        $parent.addClass('confirmed');
    } else if(submitted_date > deadline_date) {
        //task was submitted after deadlien
        $parent.find('#status').text('completed (late)');
        $parent.addClass('failed');
    }
    $parent.prop('disabled', true);
    updateProgress();
}

$(document).ready(function() {
    window.setTimeout(updateProgress, 1500); //call the updateProgress 1.5s after load

    var $TABLE = $('#task-table');
    var $CLONE = $TABLE.find('tr.hide');

    //get sprints for the current group
    let SPRINTS;
    socket.emit('fetchSprints', currentGroup, function(sprints) {
        SPRINTS = sprints;
        sprints.forEach(sprint => {
            var option = document.createElement('option');
            option.value = sprint.sprintName;
            option.innerHTML = CapitalizeWords(sprint.sprintName);
            $(option).prop('id', 'sprint');
            $('#sprintList').append(option);
        })
    })

    

    //update clone dropdown for each member in the group
    groupMembers.forEach(member => {
        var option = document.createElement('option');
        option.value = member;
        option.innerHTML = member;
        $CLONE.find('#assigned').find('select').append(option);
    })

    $('tr').find('#submitted input').change(function() {
        var $parent = $(this).parent();
        if(this.checked) {
            var current_date = new Date(); //get the current date
            var date_element = document.createElement('span'); //create date DOM
            date_element.innerText = current_date.toLocaleDateString(); //set DOM text
            
            $parent.append(date_element);
            $parent.attr('date-submitted', Date.now());

            checkSubmissionDate($parent, $parent.parent().find('#deadline input'), $parent.parent()); //check if submitted before deadline 
        } else if(!this.checked) {
            $parent.parent().find('#status').text('in-progress');
            $parent.find('span').remove();
            $parent.parent().removeClass('confirmed failed');
            $parent.parent().addClass('in-progress');
            updateProgress();
        }

        //get task
        var $TASK = $(this).parent().parent();
        var otask = {};

        otask.id = $TASK.prop('value');
        otask.delivered = $(this).prop('checked');
        otask.status = $TASK.find('#status').text();

        var query = { 
            sprintName : currentSprint,
            "tasks.id" : otask.id,
        };
        var values = { $set : { "tasks.$.delivered" : otask.delivered, "tasks.$.status" : otask.status}};

        //upload change to server
        socket.emit('updateTask', currentGroup, currentSprint, otask, query, values)

    })

    $('tr').find('#assigned select').change(function() {
        var text = $(this).text();
        var status = $(this).parent().parent().find('#status');

        if(text.toLowerCase() !== 'select a person' && !status.parent().hasClass('confirmed')) {
            status.text('in-progress');
            status.parent().removeClass('confirmed');
            status.parent().addClass('in-progress');   
        } else if(text.toLowerCase() === 'select a person'){
            status.text('not started');
            status.parent().removeClass('in-progress');
        }

        //get task
        var $TASK = $(this).parent().parent();
        var otask = {};

        otask.id = $TASK.prop('value');
        otask.assigned = $(this).prop('value');
        otask.status = $TASK.find('#status').text();

        var query = { 
            sprintName : currentSprint,
            "tasks.id" : otask.id,
        };
        var values = { $set : { "tasks.$.assigned" : otask.assigned, "tasks.$.status" : otask.status}};

        //upload change to server
        socket.emit('updateTask', currentGroup, currentSprint, otask, query, values)
    })

    $('tr').find('#deadline input').change(function() {
        //get task
        var $TASK = $(this).parent().parent();
        var otask = {};

        otask.id = $TASK.prop('value');
        otask.deadline = $(this).prop('value');

        var query = { 
            sprintName : currentSprint,
            "tasks.id" : otask.id,
        };
        var values = { $set : { "tasks.$.deadline" : otask.deadline}};

        //upload change to server
        socket.emit('updateTask', currentGroup, currentSprint, otask, query, values)
    })

    //add a new row to the table when add table button is clicked
    $('.table-add').on('click', function () {
        var $clone = $CLONE.clone(true).removeClass('hide table-line');

        //update task ID
        lastTaskID++;
        //set value to equal new id
        $clone.prop('value', lastTaskID)
        //add new row to table
        $TABLE.append($clone);
        //update progress bar
        updateProgress();

        var task = { 
            status : 'not started',
            desc : 'task description',
            assigned : '',
            deadline : new Date(),
            delivered : false,
            id : lastTaskID
        }

        socket.emit('addTask', currentGroup, currentSprint, task);
    });

    //remove the corresponding row from the table when remove button is pressed (move to clone functions??)
    $('.table-remove').on('click', function () {
        var row_id = $(this).parents('tr').val();
        
        socket.emit('removeTask', currentGroup, currentSprint, row_id);
        $(this).parents('tr').detach();
        //update progress bar after a row is deleted
        updateProgress();
    });

    $('#member-tasks-view').click(function() {
        //get task count for each member
        graph_data = {};
        groupMembers.forEach(member => {
            graph_data[member] = 0;
        })

        var $TABLE = $('#task-table');
        $TABLE.find('tbody').children().toArray().forEach(row => {
            var user = $(row).find('#assigned').find('select').val();
            if(user != '') {
                graph_data[user] += 1;
            }
        })
        ipc.send('createGraphWindow', 'task distribution', 'bar', graph_data);
    })

    $('#burndown-view').click(function() {
        //get data

        ipc.send('createGraphWindow', 'burndown chart', 'burndown');
    })

    $('#submission-frequency-view').click(function() {
        //object of date : submission count
        graph_data = {};

        var $TABLE = $('#task-table');
        $TABLE.find('tbody').children().toArray().forEach(row => {
            var date = $(row).find('#deadline').find('input').val();
            // console.log(date);
            var submitted = $(row).find('#submitted').find('input').prop('checked');
            // console.log(submitted);
            if(date != '' && submitted) {
                if(graph_data[date] == undefined) {
                    graph_data[date] = 1;
                } else {
                    graph_data[date] += 1;
                }
            }
        })
        ipc.send('createGraphWindow', 'date task distribution', 'line', graph_data);
    })

    $('#createSprint').click(function(){
        ipc.send('createSprintWindow', 'sprint creator', {});
    })

    $('#sprintList').change(function() {
        //remove all rows that are not the main clone
        $TABLE.find('tbody').children().toArray().forEach(row => {
            if(!$(row).hasClass('hide')) {
                $(row).detach();
            }
        })
        //update current sprint
        currentSprint = $(this).prop('value');
        //refresh table with new sprint data
        socket.emit('refreshScrum', currentGroup, currentSprint);

        $('.section-header').text(CapitalizeWords(currentSprint) + ' Progress');

        setTimeout(updateProgress, 1000);
    })

})
    

    

    
