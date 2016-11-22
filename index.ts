#!/usr/bin/env node

import * as fs from 'fs';
import * as _ from 'lodash';
import * as crypto from 'crypto';

const vorpal = require('vorpal')();
const Table = require('easy-table');

interface Isession {
    nopyfile: string;
    answer_password: IAnswerPassword | null;
    parsed_accounts: Array<IAccount> | null;
}

let nopyfile = "default.nopy";
let sessions: Array<Isession> = [];

interface IAnswer {
    username: string;
    password: string;
    account: string;
}

interface AnswerPasswordFunc {
    (
        answer_password: IAnswerPassword,
        parsed_accounts: Array<IAccount>
    )
}

interface IAnswerPassword {
    master_password: string;
}

interface IAccount {
    username: string;
    password: string;
    account: string;
}

function decryptText(text: string, password: string) {
    const cipher = crypto.createDecipher('aes256', password);
    let decrypted = "";
    try {
        decrypted = cipher.update(text, 'binary', 'utf8');
        decrypted += cipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.log("master password is wrong, please retry");
        return null;
    }
}

function encryptText(text: string, password: string) {
    const cipher = crypto.createCipher('aes256', password);
    let encrypted = cipher.update(text, 'utf8', 'binary');
    encrypted += cipher.final('binary');
    return encrypted;
}

function readFile(password: string, cb: Function, vcb) {
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
        let parsed_accounts: Array<IAnswer> = [];
        if (accounts && accounts.byteLength !== 0) {
            parsed_accounts = JSON.parse(decryptText(accounts.toString(), password));
            if (parsed_accounts) {
                cb(parsed_accounts);
            } else {
                vcb();
                return;
            }
        }
    });
}

function writeFile(password: string, data: string, cb: Function) {
    fs.writeFile(nopyfile, encryptText(data, password), (err) => {
        cb(err);
    });
}

function removeAccountToFile(master_password: string, parsed_accounts: Array<IAccount>, answers: IAccount) {
    let exist = _.find(parsed_accounts, { account: answers.account });
    if (!exist) {
        console.log("sorry this account does not exist");
        return;
    }
    _.remove(parsed_accounts, { account: answers.account });
    let modified_data = JSON.stringify(parsed_accounts);
    writeFile(master_password, modified_data, (err) => {
        if (err) throw err;
    });
}

function accountExist(parsed_accounts, account) {
    let exist = _.find(parsed_accounts, { account: account });
    return !!exist;
}

function addAccountToFile(master_password: string, parsed_accounts: Array<IAccount>, answers: IAccount) {
    parsed_accounts.push(answers)
    let modified_data = JSON.stringify(parsed_accounts);
    writeFile(master_password, modified_data, (err) => {
        if (err) throw err;
    });
}

function listByAccount(master_password: string, parsed_accounts: Array<IAccount>, account_to_find: string, cb: Function) {
    let filtered_parsed_accounts = _.filter(parsed_accounts, (account: IAccount) => {
        return _.includes(account.account, account_to_find);
    })
    return cb(filtered_parsed_accounts as Array<IAccount>);
}

function isMasterPasswordIsCorrect(inquirer, cb: AnswerPasswordFunc, vcb) {
    let session = _.find(sessions, { nopyfile: nopyfile });
    if (session && session.answer_password && session.parsed_accounts) {
        cb(session.answer_password, session.parsed_accounts);
        return;
    }
    inquirer.prompt([{
        type: 'password',
        name: 'master_password',
        message: 'master password:'
    }]).then((answer_password: IAnswerPassword) => {
        readFile(answer_password.master_password, function (parsed_accounts: Array<IAccount>) {
            sessions.push({
                nopyfile: nopyfile,
                answer_password: answer_password,
                parsed_accounts: parsed_accounts
            });
            cb(answer_password, parsed_accounts);
        }, vcb);
    });
}

function print(accounts: Array<IAccount>) {
    var t = new Table

    accounts.forEach(function (account) {
        t.cell('Account', account.account)
        t.cell('Username', account.username)
        t.cell('Password', account.password)
        t.newRow()
    })

    console.log(t.toString())
}

function fileExists(path_file: string) {
    return new Promise((resolve, reject) => {
        if (!path_file) {
            resolve(nopyfile);
        }
        fs.stat(path_file, function (err, stat) {
            if (err == null) {
                nopyfile = path_file;
                resolve(nopyfile);
            } else if (err.code == 'ENOENT') {
                console.log( path_file + " file does not exist");
                reject();
            } else {
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
                }]).then((answers: IAnswer) => {
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
    .command('edit <account> [file]')
    .description('Add an account.')
    .action(function (args, callback) {
        fileExists(args.file).then((exist) => {
            isMasterPasswordIsCorrect(this, (answers_password, parsed_accounts) => {
                if (!accountExist(parsed_accounts, args.account)) {
                    console.log("Sorry there is no account called " + args.account);
                    callback();
                    return;
                }
                this.prompt([{
                    type: 'input',
                    name: 'username',
                    message: 'username:',
                    default: parsed_accounts[0].username
                }, {
                    type: 'input',
                    name: 'password',
                    message: 'password:',
                    default: parsed_accounts[0].password
                }]).then((answers: IAnswer) => {
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
                    } else {
                        console.log("nothing changed");
                    }
                    callback();
                })
            }, callback);
        }, () => {
            callback();
        });
    })

vorpal
    .command('search <account> [file]')
    .description('search for an account.')
    .alias('find')
    .action(function (args, callback) {
        fileExists(args.file).then((exist) => {
            isMasterPasswordIsCorrect(this, (answers_password, parsed_accounts) => {
                listByAccount(answers_password.master_password, parsed_accounts, args.account, (accounts: Array<IAccount>) => {
                    if (accounts.length > 1) {
                        let account_list = _.map(accounts, (account) => {
                            return account.account
                        });
                        this.prompt([{
                            type: 'list',
                            name: 'account_choosen',
                            message: 'account list',
                            choices: account_list,
                            default: account_list[0]
                        }]).then((answers) => {
                            let account_choosen = [_.find(accounts, { account: answers.account_choosen })]
                            if (args.p) {
                                console.log(account_choosen[0].password);
                            } else {
                                print(account_choosen);
                            }
                            callback();
                        });
                    } else {
                        if (args.p) {
                            console.log(accounts[0].password);
                        } else {
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
                console.log(nopyfile + " does not exist and it will be created!")
                this.prompt([{
                    type: 'password',
                    name: 'master_password',
                    message: 'master password:'
                }]).then((answers_password) => {
                    writeFile(answers_password.master_password, JSON.stringify(arr), (err) => {
                        if (err) {
                            console.log("sorry something went wrong");
                        } else {
                            console.log(nopyfile + ' created and initialized! Now you can start to add accounts, try:\nadd facebook');
                        }
                        callback();
                    });
                });
                return
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
                            }]).then((answers_password: IAnswerPassword) => {
                                writeFile(answers_password.master_password, JSON.stringify(arr), (err) => {
                                    if (err) {
                                        console.log("sorry something went wrong.");
                                    } else {
                                        _.remove(sessions, { nopyfile: nopyfile });
                                        console.log(nopyfile + ' created and initialized! Now you can start to add accounts, try:\nadd facebook.');
                                    }
                                    callback();
                                });
                            });
                        } else {
                            callback();
                        }
                    });
                }
            }, callback);
        });
    });

vorpal.show();