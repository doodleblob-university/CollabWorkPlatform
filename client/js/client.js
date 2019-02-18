const remote = require('electron').remote;
const ipc= require('electron').ipcRenderer;

function createGroup(args) {
    //create new group and group tag
    var group = document.createElement('div');
    var groupName = document.createElement('span');

    //set styling attributes and values
    group.setAttribute('class', 'group');
    group.setAttribute('groupName', args.groupName);
    group.setAttribute('style', 'background-color : ' + args.backgroundColor + '; color : ' + args.fontColor + ';');
    groupName.innerHTML = String(args.groupName).toUpperCase()[0];
    
    // add elements in correct place in dom
    group.appendChild(groupName);
    $('#addNewGroup').before(group);

    console.log('new group has been added...');
}

(function(){
    var element = function(id){
        return document.getElementById(id);
    }

    // Get Elements
    var status = element('status');
    var messages = element('messages');
    var textarea = element('textarea');
    var username = element('username');
    var clearBtn = element('clear');
    var sendBtn = element('submit');

    var s_username = 'joe';

    // Set default status
    var statusDefault = status.textContent;
    var setStatus = function(s){
        // Set status
        status.textContent = s;
        if(s !== statusDefault){
            var delay = setTimeout(function(){
                setStatus(statusDefault);
            }, 4000);
        }
    }
    // Connect to socket.io
    const socket = io('http://localhost:4000');
    if(socket !== undefined){
        // Handle Output
        socket.on('confirmation', function() {
            var connLabel = element('conn-status');
            connLabel.innerText = 'Connection Confirmed!';
            connLabel.setAttribute('class', 'confirmed');

            var groupName = window.location.search;
            if(!groupName){
                groupName = 'chats';
            }else{
                groupName = groupName.substr(1);
            }
            socket.emit('group', groupName );

        })

        socket.on('output', function(data){
            if(data.length){
                for(var x = 0;x < data.length;x++){
                    // Build out message div
                    var message = document.createElement('div');
                    var message_content = document.createElement('div');
                    var message_info = document.createElement('div');

                    message.setAttribute('class', 'message');
                    message_content.setAttribute('value', data[x].name);
                    message_info.setAttribute('class', 'message-info');

                    if(data[x].name === s_username) {
                        message_content.setAttribute('class', 'chat-message self-message');
                    } else {
                        message_content.setAttribute('class', 'chat-message other-message');

                    }
                    message_content.textContent = data[x].message;
                    message_info.textContent = data[x].name + ' sent - 5:07pm';

                    message.appendChild(message_content);
                    message_content.appendChild(message_info);
                    messages.appendChild(message);
                    messages.insertBefore(message, messages.lastChild);
                }
            } else {
                var message = document.createElement('div');
                message.setAttribute('class', 'chat-message');
                message.textContent = "Chat history not available";
                messages.appendChild(message);
                messages.insertBefore(message, messages.firstChild);
            }
        });
        // Get Status From Server
        socket.on('status', function(data){
            // get message status
            setStatus((typeof data === 'object')? data.message : data);
            // If status is clear, clear text
            if(data.clear){
                textarea.value = '';
            }
        });

        socket.on('announcement', function(message){
            alert(message);
        });

        //Send information when someone is typing
        textarea.addEventListener('keypress', function(){
          socket.emit('typing', username.value);
        });

        //Display who is typing
        socket.on('typing', function(data){
          feedback.innerHTML = '<p><em>' + data + ' is typing a message...</em></p>';
        });

        //Clear who is clearTyping
        socket.on('clearTyping',function(){
          feedback.innerHTML = "";
        });

        // Handle Input
        textarea.addEventListener('keydown', function(event){
            if(event.which === 13 && event.shiftKey == false){
                // Emit to server input
                socket.emit('input', {
                    name:username.value,
                    message:textarea.value
                });
                event.preventDefault();
            }
        })

        sendBtn.addEventListener('click', function() {
            socket.emit('input', {
                name:username.value,
                message:textarea.value
            });
            event.preventDefault();
        });

        $(document).on('click', '.group', function() {
            $('#project-name').text($(this).attr('groupname'));
        })

        $('#addNewGroup').on('click', function() {
            ipc.send('createGroupWindow');
        })

        //create a new group
        ipc.on('addNewGroup', (event, args) => {
            createGroup(args);
        })

        //get console updates from app
        ipc.on('update', (event, args) => {
            
            console.log(args);
        })
    }
})();
