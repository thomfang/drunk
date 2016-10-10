drunk.Component.define('todo-item', {
    templateUrl: 'todo-item.html'
});

var TodoApp = drunk.Component.extend({

    init: function () {
        this.todoList = [];
    },

    addTodo: function () {
        if (!this.content) {
            return;
        }

        this.todoList.unshift({
            title: this.content,
            completed: false
        });

        this.content = '';
    },

    removeTodo: function () {
        if (this.currIndex == null) {
            return;
        }

        this.todoList.$removeAt(this.currIndex);
    },

    confirmRemove: function (index) {
        this.alertVisible = true;
        this.currIndex = index;
    },

    cancelRemove: function () {
        this.alertVisible = false;
        this.currIndex = null;
    }
});

var app = new TodoApp();

app.$mount(document.body);