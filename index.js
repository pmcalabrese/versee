#!/usr/bin/env node
"use strict";
const fs = require('fs');
const _ = require('lodash');
const file = require('./file');
const vorpal = require('vorpal')();
const ncp = require("copy-paste");
vorpal
    .command('add <account> [file]')
    .description('Add an account.')
    .action(function (args, callback) {
    file.exist(args.file).then((exist) => {
        file.isMasterPasswordCorrect(this, (answers_password, parsed_accounts) => {
            if (file.accountExist(parsed_accounts, args.account)) {
                console.log("An account called " + args.account + " already exist, choose another name");
                callback();
                return;
            }
            this.prompt([{
                    type: 'input',
                    name: 'username',
                    message: 'username:'
                }, {
                    type: 'input',
                    name: 'password',
                    message: 'password:'
                }]).then((answers) => {
                answers.account = args.account;
                let account = answers;
                file.addAccount(answers_password.master_password, parsed_accounts, answers);
                callback();
            });
        }, callback);
    }, () => {
        callback();
    });
});
vorpal
    .command('duplicate <account> <duplicate_account>')
    .alias('clone')
    .description('Duplicate an account.')
    .action(function (args, callback) {
    file.exist(args.file).then((exist) => {
        file.isMasterPasswordCorrect(this, (answers_password, parsed_accounts) => {
            if (!file.accountExist(parsed_accounts, args.account)) {
                console.log("Sorry this account does not exist");
                callback();
                return;
            }
            if (file.accountExist(parsed_accounts, args.duplicate_account)) {
                console.log("Sorry this account already exist");
                callback();
                return;
            }
            let duplicate_account = _.clone(_.find(parsed_accounts, { account: args.account }));
            duplicate_account.account = args.duplicate_account;
            file.addAccount(answers_password.master_password, parsed_accounts, duplicate_account);
            callback();
        }, callback);
    }, () => {
        callback();
    });
});
vorpal
    .command('edit <account> [file]')
    .description('Edit an account.')
    .action(function (args, callback) {
    file.exist(args.file).then((exist) => {
        file.isMasterPasswordCorrect(this, (answers_password, parsed_accounts) => {
            if (!file.accountExist(parsed_accounts, args.account)) {
                console.log("Sorry there is no account called " + args.account);
                callback();
                return;
            }
            let default_account = _.find(parsed_accounts, { account: args.account });
            this.prompt([{
                    type: 'input',
                    name: 'username',
                    message: 'username:',
                    default: default_account.username
                }, {
                    type: 'input',
                    name: 'password',
                    message: 'password:',
                    default: default_account.password
                }]).then((answers) => {
                answers.account = args.account;
                let account = answers;
                file.editAccount(answers_password.master_password, parsed_accounts, answers);
                callback();
            });
        }, callback);
    }, () => {
        callback();
    });
});
vorpal
    .command('Remove <account> [file]')
    .alias('rm')
    .description('Remove an account.')
    .action(function (args, callback) {
    file.exist(args.file).then((exist) => {
        file.isMasterPasswordCorrect(this, (answers_password, parsed_accounts) => {
            if (!file.accountExist(parsed_accounts, args.account)) {
                console.log("Sorry there is no account called " + args.account);
                callback();
                return;
            }
            this.prompt([{
                    type: "confirm",
                    name: "sure_delete",
                    message: "Are you sure do you want to delete " + args.account + " account?",
                    default: false
                }]).then((answers) => {
                if (answers.sure_delete) {
                    file.removeAccount(answers_password.master_password, parsed_accounts, { account: args.account });
                    console.log("account deleted");
                }
                else {
                    console.log("nothing changed");
                }
                callback();
            });
        }, callback);
    }, () => {
        callback();
    });
});
vorpal
    .command('search <account> [file]')
    .alias('find')
    .description('search for an account.')
    .action(function (args, callback) {
    file.exist(args.file).then((exist) => {
        file.isMasterPasswordCorrect(this, (answers_password, parsed_accounts) => {
            file.listByAccount(answers_password.master_password, parsed_accounts, args.account, (accounts) => {
                if (accounts.length > 1) {
                    let account_list = _.map(accounts, (account) => {
                        return account.account;
                    });
                    this.prompt([{
                            type: 'list',
                            name: 'account_choosen',
                            message: 'account list',
                            choices: account_list,
                            default: account_list[0]
                        }]).then((answers) => {
                        let account_choosen = [_.find(accounts, { account: answers.account_choosen })];
                        file.print(account_choosen, true);
                        callback();
                    });
                }
                else {
                    file.print(accounts);
                    callback();
                }
            });
        }, callback);
    }, () => {
        callback();
    });
});
vorpal
    .command('copy password <account> [file]')
    .alias('copy')
    .description('copy in the clipboard the password.')
    .action(function (args, callback) {
    console.log("args", args);
    file.exist(args.file).then((exist) => {
        file.isMasterPasswordCorrect(this, (answers_password, parsed_accounts) => {
            file.listByAccount(answers_password.master_password, parsed_accounts, args.account, (accounts) => {
                if (accounts.length > 1) {
                    let account_list = _.map(accounts, (account) => {
                        return account.account;
                    });
                    this.prompt([{
                            type: 'list',
                            name: 'account_choosen',
                            message: 'account list',
                            choices: account_list,
                            default: account_list[0]
                        }]).then((answers) => {
                        let account_choosen = [_.find(accounts, { account: answers.account_choosen })];
                        copy(account_choosen[0].password, function () {
                            callback();
                        });
                    });
                }
                else {
                    copy(accounts[0].password, function () {
                        callback();
                    });
                }
            });
        }, callback);
    }, () => {
        callback();
    });
});
vorpal
    .command('copy username <account> [file]')
    .description('copy in the clipboard the password.')
    .action(function (args, callback) {
    console.log("args", args);
    file.exist(args.file).then((exist) => {
        file.isMasterPasswordCorrect(this, (answers_password, parsed_accounts) => {
            file.listByAccount(answers_password.master_password, parsed_accounts, args.account, (accounts) => {
                if (accounts.length > 1) {
                    let account_list = _.map(accounts, (account) => {
                        return account.account;
                    });
                    this.prompt([{
                            type: 'list',
                            name: 'account_choosen',
                            message: 'account list',
                            choices: account_list,
                            default: account_list[0]
                        }]).then((answers) => {
                        let account_choosen = [_.find(accounts, { account: answers.account_choosen })];
                        ncp.copy(account_choosen[0].username, function () {
                            callback();
                        });
                    });
                }
                else {
                    ncp.copy(accounts[0].username, function () {
                        callback();
                    });
                }
            });
        }, callback);
    }, () => {
        callback();
    });
});
function copy(text, cb, time = 10000) {
    var t;
    clearTimeout(t);
    ncp.copy(text, function () {
        console.log("\nPassword is copied in the clipboard and it will stay for for the next 10 seconds");
        cb();
        var t = setTimeout(function () {
            ncp.copy("", function () { });
        }, time);
    });
}
vorpal
    .command('list [file]')
    .alias("ls")
    .description('List all the accounts.')
    .action(function (args, callback) {
    file.exist(args.file).then((exist) => {
        file.isMasterPasswordCorrect(this, (answers_password, parsed_accounts) => {
            file.print(parsed_accounts);
            callback();
        }, callback);
    }, () => {
        callback();
    });
});
vorpal
    .command('switch [file]')
    .alias('use')
    .alias('workon')
    .description('Switch file.')
    .action(function (args, callback) {
    file.exist(args.file).then((exist) => {
        console.log("Now you are working on: " + file.default_file);
        callback();
    }, () => {
        callback();
    });
});
vorpal
    .command('which')
    .description('Show which file I am workin on.')
    .alias('file')
    .action(function (args, callback) {
    console.log("Now you are working on: " + file.default_file);
    callback();
});
vorpal
    .command('init [file]')
    .alias('i')
    .description('Init a new file.')
    .action(function (args, callback) {
    file.default_file = args.file ? args.file : file.default_file;
    let arr = [];
    fs.readFile(file.default_file, (err, data) => {
        if (err) {
            console.log(file.default_file + " does not exist and it will be created!");
            this.prompt([{
                    type: 'password',
                    name: 'master_password',
                    message: 'master password:'
                }]).then((answers_password) => {
                file.write(answers_password.master_password, JSON.stringify(arr), (err) => {
                    if (err) {
                        console.log("sorry something went wrong");
                    }
                    else {
                        console.log(file.default_file + ' created and initialized! Now you can start to add accounts, try:\nadd facebook');
                    }
                    callback();
                });
            });
            return;
        }
        file.isMasterPasswordCorrect(this, (answers_password, parsed_accounts) => {
            if (data && data.byteLength > 0) {
                this.prompt([{
                        type: "confirm",
                        name: "sure_reinit",
                        message: file.default_file + "file exist and does not seems to be empty, if you continue you will loose all your accounts. \n Are you sure you want to continue?",
                        default: false
                    }]).then((answers_2) => {
                    if (answers_2.sure_reinit) {
                        this.prompt([{
                                type: 'password',
                                name: 'master_password',
                                message: 'master password:'
                            }]).then((answers_password) => {
                            file.write(answers_password.master_password, JSON.stringify(arr), (err) => {
                                if (err) {
                                    console.log("sorry something went wrong.");
                                }
                                else {
                                    _.remove(file.sessions, { default_file: file.default_file });
                                    console.log(file.default_file + ' created and initialized! Now you can start to add accounts, try:\nadd facebook.');
                                }
                                callback();
                            });
                        });
                    }
                    else {
                        callback();
                    }
                });
            }
        }, callback);
    });
});
vorpal.show();
