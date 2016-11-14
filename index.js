#!/usr/bin/env node
"use strict";
var fs = require('fs');
var yargs = require('yargs');
var inquirer = require('inquirer');
var _ = require('lodash');
var crypto = require('crypto');
var nopyfile = "./default.nopy";
function decryptText(text, password) {
    if (password.trim() === "") {
        console.log("the master password cannot be empty");
        process.exit();
    }
    var cipher = crypto.createDecipher('aes256', password);
    var decrypted = "";
    try {
        decrypted = cipher.update(text, 'binary', 'utf8');
        decrypted += cipher.final('utf8');
    }
    catch (error) {
        console.log("master password is wrong ,retry");
        process.exit();
    }
    return decrypted;
}
function encryptText(text, password) {
    var cipher = crypto.createCipher('aes256', password);
    var encrypted = cipher.update(text, 'utf8', 'binary');
    encrypted += cipher.final('binary');
    return encrypted;
}
function readFile(password, cb) {
    fs.readFile(nopyfile, function (err, accounts) {
        var parsed_accounts = [];
        if (accounts && accounts.byteLength !== 0) {
            parsed_accounts = JSON.parse(decryptText(accounts.toString(), password));
        }
        cb(parsed_accounts);
    });
}
function writeFile(password, data, cb) {
    fs.writeFile(nopyfile, encryptText(data, password), function (err) {
        cb(err);
    });
}
function addAccountToFile(master_password, answers) {
    readFile(master_password, function (parsed_accounts) {
        var exist = _.find(parsed_accounts, { account: answers.account });
        if (exist) {
            console.log("sorry this account exist change account name");
            return;
        }
        parsed_accounts.push(answers);
        var modified_data = JSON.stringify(parsed_accounts);
        writeFile(master_password, modified_data, function (err) {
            if (err)
                throw err;
        });
    });
}
function listByAccount(master_password, account_to_find, cb) {
    readFile(master_password, function (parsed_accounts) {
        var filtered_parsed_accounts = _.filter(parsed_accounts, function (account) {
            return _.includes(account.account, account_to_find);
        });
        return cb(filtered_parsed_accounts);
    });
}
function listAllAccounts(master_password, cb) {
    readFile(master_password, function (parsed_accounts) {
        return cb(parsed_accounts);
    });
}
yargs
    .command('add <account> [file]', 'add a new account', function (yargs) {
    return yargs
        .example("nopy add facebook", "add facebook credentials")
        .demand(1);
}, function (argv) {
    console.log("argv", argv);
    nopyfile = argv.file ? argv.file : nopyfile;
    inquirer.prompt([{
            type: 'input',
            name: 'master_password',
            message: 'master password:'
        }, {
            type: 'input',
            name: 'username',
            message: 'username:'
        }, {
            type: 'input',
            name: 'password',
            message: 'password:'
        }]).then(function (answers) {
        answers.account = argv.account;
        var master_password = answers.master_password;
        delete answers.master_password;
        var account = answers;
        addAccountToFile(master_password, answers);
    });
})
    .command('search <account> [file]', 'search for an account', function (yargs) {
    return yargs
        .example("nopy search facebook", "search credentials for the facebook account")
        .demand(1);
}, function (argv) {
    nopyfile = argv.file ? argv.file : nopyfile;
    inquirer.prompt([{
            type: 'input',
            name: 'master_password',
            message: 'master password:'
        }]).then(function (answers) {
        listByAccount(answers.master_password, argv.account, function (accounts) {
            if (accounts.length > 1) {
                var account_list = _.map(accounts, function (account) {
                    return account.account;
                });
                inquirer.prompt([{
                        type: 'list',
                        name: 'account_choosen',
                        message: 'account list',
                        choices: account_list,
                        default: account_list[0]
                    }]).then(function (answers) {
                    var account_choosen = _.find(accounts, { account: answers.account_choosen });
                    console.log(account_choosen);
                });
            }
            else {
                console.log(accounts);
            }
        });
    });
})
    .command('list [file]', 'list all the accounts', function (yargs) {
    return yargs
        .example("nopy list", "list all accounts")
        .demand(0);
}, function (argv) {
    nopyfile = argv.file ? argv.file : nopyfile;
    inquirer.prompt([{
            type: 'input',
            name: 'master_password',
            message: 'master password:'
        }]).then(function (answers) {
        listAllAccounts(answers.master_password, function (accounts) {
            console.log("accounts", accounts);
        });
    });
})
    .command('init [file]', 'intialize a credential container file (start from here)', function (yargs) {
    return yargs
        .example("nopy init", "intialize a credential container file")
        .demand(0);
}, function (argv) {
    nopyfile = argv.file ? argv.file : nopyfile;
    inquirer.prompt([{
            type: 'input',
            name: 'master_password',
            message: 'Choose your master password (DO NOT LOSE IT!):'
        }]).then(function (answers_1) {
        var arr = [];
        fs.readFile(nopyfile, function (err, data) {
            if (data && data.byteLength > 0) {
                inquirer.prompt([{
                        type: "confirm",
                        name: "sure_reinit",
                        message: nopyfile + " does not seems to be empty, if you continye you will loose all your accounts. \n Are you sure you want to re-init?",
                        default: false
                    }]).then(function (answers_2) {
                    if (answers_2.sure_reinit) {
                        writeFile(answers_1.master_password, JSON.stringify(arr), function (err) {
                            if (err) {
                                console.log("sorry something went wrong", err);
                            }
                            else {
                                console.log(nopyfile + ' initialized! Now you can start to add passwords,\ntry: nopy --file="' + nopyfile + '" add facebook');
                            }
                        });
                    }
                    else {
                        console.log("Initialization aborted. Nothing changed");
                    }
                });
            }
            else {
                console.log("answers_1.master_password", answers_1.master_password);
                writeFile(answers_1.master_password, JSON.stringify(arr), function (err) {
                    if (err) {
                        console.log("sorry something went wrong");
                    }
                    else {
                        console.log(nopyfile + ' initialized! Now you can start to add passwords,\ntry: nopy --file="' + nopyfile + '" add facebook');
                    }
                });
            }
        });
    });
})
    .demand(1)
    .wrap(72)
    .argv;
//# sourceMappingURL=index.js.map