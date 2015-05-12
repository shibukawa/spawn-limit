"use strict";

var originalSpawn = require("child_process").spawn;

var limitCount = 10;
var currentCount = 0;
var monitorCallback = null;
var taskId = 0;
var remainedTasks = [];
var remainedTaskCallbacks = {};
var waitAllCallbacks = [];
var intervalId = null;

/*
 * Set process limit
 */
function setLimit(limit) {
    limitCount = limit;
}

/*
 * For unit test
 */
function monitor(callback) {
    monitorCallback = callback;
}

/*
 * Internal function.
 */
function callWaitAllCallbacks() {
    for (var i = 0; i < waitAllCallbacks.length; i++) {
        waitAllCallbacks[0]();
    }
    waitAllCallbacks.splice(0, waitAllCallbacks.splice.length);
    clearInterval(intervalId);
    intervalId = null;
}

/*
 * It is compatible method of child_process.spawn, but it returns Promise.
 * Promise result is process object.
 */
function spawn() {
    startInterval();
    var args = Array.prototype.slice.call(arguments);
    if (currentCount < limitCount) {
        currentCount++;
        if (monitorCallback) {
            monitorCallback("start", remainedTasks);
        }
        return new Promise(function (resolved) {
            var process = originalSpawn.apply(null, args);
            process.on("close", function (code) {
                if (monitorCallback) {
                    monitorCallback("close", remainedTasks, code);
                }
                currentCount--;
                if (currentCount === 0 && remainedTasks.length === 0) {
                    callWaitAllCallbacks();
                }
            });
            resolved(process);
        });
    } else {
        var id = taskId++;
        remainedTasks.push([args, id]);
        if (monitorCallback) {
            monitorCallback("added", remainedTasks);
        }
        return new Promise(function (resolved) {
            remainedTaskCallbacks[id] = resolved;
        });
    }
}

/*
 * Wait all processes are finished
 */
function waitAll() {
    return new Promise(function (resolved) {
        if (currentCount === 0 && remainedTasks.length === 0) {
            resolved();
        } else {
            waitAllCallbacks.push(resolved);
        }
    });
}

/*
 * Internal method.
 */
function startInterval() {
    if (intervalId !== null) {
        return;
    }
    intervalId = setInterval(function () {
        if (remainedTasks.length && currentCount < limitCount) {
            var task = remainedTasks.shift();
            currentCount++;
            if (monitorCallback) {
                monitorCallback("start", remainedTasks);
            }
            var process = originalSpawn.apply(null, task[0]);
            process.on("close", function (code) {
                if (monitorCallback) {
                    monitorCallback("close", remainedTasks, code);
                }
                currentCount--;
                if (currentCount === 0 && remainedTasks.length === 0) {
                    callWaitAllCallbacks();
                }
            });
            var callback = remainedTaskCallbacks[task[1]];
            delete remainedTaskCallbacks[task[1]];
            if (callback) {
                callback(process);
            }
        }
    }, 20);
}

module.exports = {
    spawn: spawn,
    setLimit: setLimit,
    monitor: monitor,
    waitAll: waitAll
};

