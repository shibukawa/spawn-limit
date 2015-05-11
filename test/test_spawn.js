"use strict";

var assert = require("power-assert");
var spawn = require("../index").spawn;
var monitor = require("../index").monitor;
var waitAll = require("../index").waitAll;
var setLimit = require("../index").setLimit;

describe("spawn-limit", function () {
    var count;
    var remainedTaskCount;
    beforeEach(function () {
        count = 0;
        monitor(function (event, remainedTasks, code) {
            if (event === "start") {
                count++;
            } else if (event === "close") {
                count--;
                assert(code === 0);
            }
            remainedTaskCount = remainedTasks.length;
        });
    });

    afterEach(function () {
        return waitAll();
    });

    it("can run all process parallely within limit", function () {
        var commands = [];
        setLimit(10);
        for (var i = 0; i < 5; i++) {
            commands.push(spawn("sleep", [1]));
        }
        return Promise.all(commands).then(function () {
            assert(count === 5);
        });
    });

    it("can limit maximum count of processes", function () {
        this.timeout(5000);
        var commands = [];
        setLimit(5);
        for (var i = 0; i < 8; i++) {
            commands.push(spawn("sleep", [1]));
        }
        return Promise.all(commands.slice(0, 5)).then(function () {
            assert(count === 5);
            assert(remainedTaskCount === 3);
            return waitAll();
        }).then(function () {
            assert(count === 0);
            assert(remainedTaskCount === 0);
        });
    });
});
