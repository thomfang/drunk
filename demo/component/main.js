/// <reference path="../../build/drunk.d.ts" />

drunk.Component.define('todo-item', {
    templateUrl: 'todo-item.html'
});

var TodoApp = drunk.Component.define({

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

drunk.config.debug = true;

var app = new TodoApp();

app.$mount(document.body);