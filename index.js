#!/usr/bin/env node
"use strict";
const fs = require('fs');
const _ = require('lodash');
const crypto = require('crypto');
const vorpal = require('vorpal')();
const Table = require('easy-table');
let nopyfile = "default.nopy";
let sessions = [];
function decryptText(text, password) {
    const cipher = crypto.createDecipher('aes256', password);
    let decrypted = "";
    try {
        decrypted = cipher.update(text, 'binary', 'utf8');
        decrypted += cipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.log("master password is wrong, please retry");
        return null;
    }
}
function encryptText(text, password) {
    const cipher = crypto.createCipher('aes256', password);
    let encrypted = cipher.update(text, 'utf8', 'binary');
    encrypted += cipher.final('binary');
    return encrypted;
}
function readFile(password, cb, vcb) {
    if (password.trim() === '') {
        console.log("the master password cannot be empty");
        vcb();
        return;
    }
    fs.readFile(nopyfile, (err, accounts) => {
        if (err) {
            console.log(nopyfile + " file does not exist");
            vcb();
            return;
        }
        let parsed_accounts = [];
        if (accounts && accounts.byteLength !== 0) {
            parsed_accounts = JSON.parse(decryptText(accounts.toString(), password));
            if (parsed_accounts) {
                cb(parsed_accounts);
            }
            else {
                vcb();
                return;
            }
        }
    });
}
function writeFile(password, data, cb) {
    fs.writeFile(nopyfile, encryptText(data, password), (err) => {
        cb(err);
    });
}
function removeAccountToFile(master_password, parsed_accounts, answers) {
    let exist = _.find(parsed_accounts, { account: answers.account });
    if (!exist) {
        console.log("sorry this account does not exist");
        return;
    }
    _.remove(parsed_accounts, { account: answers.account });
    let modified_data = JSON.stringify(parsed_accounts);
    writeFile(master_password, modified_data, (err) => {
        if (err)
            throw err;
    });
}
function accountExist(parsed_accounts, account) {
    let exist = _.find(parsed_accounts, { account: account });
    return !!exist;
}
function addAccountToFile(master_password, parsed_accounts, answers) {
    parsed_accounts.push(answers);
    let modified_data = JSON.stringify(parsed_accounts);
    writeFile(master_password, modified_data, (err) => {
        if (err)
            throw err;
    });
}
function listByAccount(master_password, parsed_accounts, account_to_find, cb) {
    let filtered_parsed_accounts = _.filter(parsed_accounts, (account) => {
        return _.includes(account.account, account_to_find);
    });
    return cb(filtered_parsed_accounts);
}
function isMasterPasswordIsCorrect(inquirer, cb, vcb) {
    let session = _.find(sessions, { nopyfile: nopyfile });
    if (session && session.answer_password && session.parsed_accounts) {
        cb(session.answer_password, session.parsed_accounts);
        return;
    }
    inquirer.prompt([{
            type: 'password',
            name: 'master_password',
            message: 'master password:'
        }]).then((answer_password) => {
        readFile(answer_password.master_password, function (parsed_accounts) {
            sessions.push({
                nopyfile: nopyfile,
                answer_password: answer_password,
                parsed_accounts: parsed_accounts
            });
            cb(answer_password, parsed_accounts);
        }, vcb);
    });
}
function print(accounts) {
    var t = new Table;
    accounts.forEach(function (account) {
        t.cell('Account', account.account);
        t.cell('Username', account.username);
        t.cell('Password', account.password);
        t.newRow();
    });
    console.log(t.toString());
}
function fileExists(path_file) {
    return new Promise((resolve, reject) => {
        if (!path_file) {
            resolve(nopyfile);
        }
        fs.stat(path_file, function (err, stat) {
            if (err == null) {
                nopyfile = path_file;
                resolve(nopyfile);
            }
            else if (err.code == 'ENOENT') {
                console.log(path_file + " file does not exist");
                reject();
            }
            else {
                console.log('Something went wrong: ', err.code);
                reject();
            }
        });
    });
}
vorpal
    .command('add <account> [file]')
    .description('Add an account.')
    .action(function (args, callback) {
    fileExists(args.file).then((exist) => {
        isMasterPasswordIsCorrect(this, (answers_password, parsed_accounts) => {
            if (accountExist(parsed_accounts, args.account)) {
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
                addAccountToFile(answers_password.master_password, parsed_accounts, answers);
                callback();
            });
        }, callback);
    }, () => {
        callback();
    });
});
vorpal
    .command('remove <account> [file]')
    .description('Remove an account.')
    .action(function (args, callback) {
    fileExists(args.file).then((exist) => {
        isMasterPasswordIsCorrect(this, (answers_password, parsed_accounts) => {
            this.prompt([{
                    type: "confirm",
                    name: "sure_delete",
                    message: "Are you sure do you want to delete " + args.account + " account?",
                    default: false
                }]).then((answers) => {
                if (answers.sure_delete) {
                    removeAccountToFile(answers_password.master_password, parsed_accounts, { account: args.account });
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
    .description('search for an account.')
    .alias('find')
    .action(function (args, callback) {
    fileExists(args.file).then((exist) => {
        isMasterPasswordIsCorrect(this, (answers_password, parsed_accounts) => {
            listByAccount(answers_password.master_password, parsed_accounts, args.account, (accounts) => {
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
                        if (args.p) {
                            console.log(account_choosen[0].password);
                        }
                        else {
                            print(account_choosen);
                        }
                        callback();
                    });
                }
                else {
                    if (args.p) {
                        console.log(accounts[0].password);
                    }
                    else {
                        print(accounts);
                    }
                    callback();
                }
            });
        }, callback);
    }, () => {
        callback();
    });
});
vorpal
    .command('list [file]')
    .description('List all the accounts.')
    .alias('ls')
    .action(function (args, callback) {
    fileExists(args.file).then((exist) => {
        isMasterPasswordIsCorrect(this, (answers_password, parsed_accounts) => {
            print(parsed_accounts);
            callback();
        }, callback);
    }, () => {
        callback();
    });
});
vorpal
    .command('switch [file]')
    .description('Switch file.')
    .alias('use')
    .alias('workon')
    .action(function (args, callback) {
    fileExists(args.file).then((exist) => {
        console.log("Now you are working on: " + nopyfile);
        callback();
    }, () => {
        callback();
    });
});
vorpal
    .command('which [file]')
    .description('Show which file I am workin on.')
    .alias('show')
    .action(function (args, callback) {
    fileExists(args.file).then((exist) => {
        console.log("Now you are working on: " + nopyfile);
        callback();
    }, () => {
        callback();
    });
});
vorpal
    .command('init [file]')
    .description('Init a new container files.')
    .alias('i')
    .action(function (args, callback) {
    nopyfile = args.file ? args.file : nopyfile;
    let arr = [];
    fs.readFile(nopyfile, (err, data) => {
        if (err) {
            console.log(nopyfile + " does not exist and it will be created!");
            this.prompt([{
                    type: 'password',
                    name: 'master_password',
                    message: 'master password:'
                }]).then((answers_password) => {
                writeFile(answers_password.master_password, JSON.stringify(arr), (err) => {
                    if (err) {
                        console.log("sorry something went wrong");
                    }
                    else {
                        console.log(nopyfile + ' created and initialized! Now you can start to add accounts, try:\nadd facebook');
                    }
                    callback();
                });
            });
            return;
        }
        isMasterPasswordIsCorrect(this, (answers_password, parsed_accounts) => {
            if (data && data.byteLength > 0) {
                this.prompt([{
                        type: "confirm",
                        name: "sure_reinit",
                        message: nopyfile + "file exist and does not seems to be empty, if you continue you will loose all your accounts. \n Are you sure you want to continue?",
                        default: false
                    }]).then((answers_2) => {
                    if (answers_2.sure_reinit) {
                        this.prompt([{
                                type: 'password',
                                name: 'master_password',
                                message: 'master password:'
                            }]).then((answers_password) => {
                            writeFile(answers_password.master_password, JSON.stringify(arr), (err) => {
                                if (err) {
                                    console.log("sorry something went wrong.");
                                }
                                else {
                                    _.remove(sessions, { nopyfile: nopyfile });
                                    console.log(nopyfile + ' created and initialized! Now you can start to add accounts, try:\nadd facebook.');
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
//# sourceMappingURL=index.js.map