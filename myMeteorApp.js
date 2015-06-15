Task = new Mongo.Collection('tasks')

if (Meteor.isClient) {
    // counter starts at 0
    // Session.setDefault('counter', 0);

    Meteor.subscribe("tasks");

    Template.body.helpers({
        data: function() {
            if (Session.get('hideFinished')) {
                return Task.find({
                    checked: {
                        $ne: true
                    }
                }, {
                    sort: {
                        name: 1
                    }
                })
            } else {
                return Task.find({}, {
                    sort: {
                        name: 1
                    }
                });
            }
        },
        hideFinished: function() {
            return Session.get("hideFinished");
        },
        unFinished: function() {
            return Task.find({
                checked: {
                    $ne: true
                }
            }).count();
        }
    });

    Template.body.events({
        'submit .new-task': function(event) {
            var name = event.target.name.value;
            Meteor.call("addTask", name);

            event.target.name.value = "";

            return false;
        },
        'change .hide-finished': function(event) {
            Session.set('hideFinished', event.target.checked);
        }
    });

    Template.myTemplate.events({
        'click .toggle-checked': function() {
            Meteor.call("updateTask", this._id, !this.checked);
        },

        'click .delete': function() {
            Meteor.call("deleteTask", this._id);
        },

        "click .toggle-private": function() {
            Meteor.call("setPrivate", this._id, !this.private);
        }
    });

    Template.myTemplate.helpers({
        isOwner: function() {
            return this.owner === Meteor.userId();
        }
    });

    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
}

if (Meteor.isServer) {
    Meteor.startup(function() {
        console.log("publish server");
        // code to run on server at startup
        Meteor.publish("tasks", function() {
            return Task.find({
                $or: [{
                    private: {
                        $ne: true
                    }
                }, {
                    owner: this.userId
                }]
            });
        });
    });
}

Meteor.methods({
    addTask: function(name) {
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Task.insert({
            name: name,
            createdAt: new Date(),
            owner: Meteor.userId(),
            username: Meteor.user().username
        });
    },
    updateTask: function(taskId, setChecked) {
        var task = Task.findOne(taskId);
        if (task.private && task.owner !== Meteor.userId()) {
            // If the task is private, make sure only the owner can check it off
            throw new Meteor.Error("not-authorized");
        }
        Task.update(taskId, {
            $set: {
                checked: setChecked
            }
        })
    },
    deleteTask: function(taskId) {
        var task = Task.findOne(taskId);
        if (task.private && task.owner !== Meteor.userId()) {
            // If the task is private, make sure only the owner can delete it
            throw new Meteor.Error("not-authorized");
        }
        Task.remove(taskId);
    },
    setPrivate: function(taskId, setToPrivate) {
        var task = Task.findOne(taskId);

        // Make sure only the task owner can make a task private
        if (task.owner !== Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Task.update(taskId, {
            $set: {
                private: setToPrivate
            }
        });
    }
});
