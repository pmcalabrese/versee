import * as fs from 'fs';
import * as yargs from 'yargs';
import * as inquirer from 'inquirer';
import * as _ from 'lodash';
import * as crypto from 'crypto'

export interface IAnswer {
    username: string;
    password: string;
    account: string;
    master_password: string;
}

export interface IAccount {
    username: string;
    password: string;
    account: string;
}

function decryptText(text: string, password: string) {
    if ( password.trim() === "" ) {
        console.log("the master password cannot be empty");
        process.exit();
    }
    const cipher = crypto.createDecipher('aes256', password);
    let decrypted = "";
    try {
        decrypted = cipher.update(text, 'binary', 'utf8');
        decrypted += cipher.final('utf8');
    } catch (error) {
        console.log("master password is wrong ,retry");
        process.exit();
    }
    return decrypted;
}

function encryptText(text: string, password: string) {
    const cipher = crypto.createCipher('aes256', password);
    let encrypted = cipher.update(text, 'utf8', 'binary');
    encrypted += cipher.final('binary');
    return encrypted;
}

function readFile(password: string, cb: Function) {
    fs.readFile('./accounts.json', (err, accounts) => {
        let parsed_accounts: Array<IAnswer> = [];
        if (accounts.byteLength !== 0) {
            parsed_accounts = JSON.parse(decryptText(accounts.toString(), password));
        }
        cb(parsed_accounts);
    });
}

function writeFile(password: string, data: string, cb: Function) {
    fs.writeFile('./accounts.json', encryptText(data, password), (err) => {
        cb(err);
    });
}

function addAccountToFile(master_password: string, answers: IAccount) {
    readFile(master_password, (parsed_accounts: Array<IAccount>) => {
        let exist = _.find(parsed_accounts, { account: answers.account });
        if (exist) {
            console.log("sorry this account exist change account name");
            return;
        }
        parsed_accounts.push(answers)
        let modified_data = JSON.stringify(parsed_accounts);
        writeFile(master_password, modified_data, (err) => {
            if (err) throw err;
        })
    });
}

function listByAccount(master_password: string, account_to_find: string, cb: Function) {
    readFile(master_password, (parsed_accounts: Array<IAccount>) => {
        let filtered_parsed_accounts = _.filter(parsed_accounts, (account: IAccount) => {
            return _.includes(account.account, account_to_find);
        })
        return cb(filtered_parsed_accounts as Array<IAccount>);
    });
}

function listAllAccounts(master_password: string, cb: Function) {
    readFile(master_password, (parsed_accounts: Array<IAccount>) => {
        return cb(parsed_accounts as Array<IAccount>);
    });
}

yargs
    .command('add <account>', 'add a new account', function (yargs) {
        return yargs.demand(1);
    }, (argv: any) => {
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
        }]).then((answers: IAnswer) => {
            answers.account = argv.account;
            let master_password = answers.master_password;
            delete answers.master_password;
            let account = answers;
            addAccountToFile(master_password, answers);
        });
    })
    .command('account <account>', 'search for an account', function (yargs) {
        return yargs.demand(1);
    }, (argv: any) => {
        inquirer.prompt([{
            type: 'input',
            name: 'master_password',
            message: 'master password:'
        }]).then((answers: IAnswer) => {
            listByAccount(answers.master_password, argv.account, (accounts: Array<IAccount>) => {
                if (accounts.length > 1) {
                    let account_list = _.map(accounts, (account) => {
                        return account.account
                    });
                    inquirer.prompt([{
                        type: 'list',
                        name: 'account_choosen',
                        message: 'account list',
                        choices: account_list,
                        default: account_list[0]
                    }]).then((answers) => {
                        let account_choosen = _.find(accounts, { account: answers.account_choosen })
                        console.log(account_choosen)
                    });
                } else {
                    console.log(accounts);
                }
            })
        });
    })
    .command('list', 'list all the accounts', function (yargs) {
        return yargs.demand(0);
    }, (argv: any) => {
        inquirer.prompt([{
            type: 'input',
            name: 'master_password',
            message: 'master password:'
        }]).then((answers: IAnswer) => {
            listAllAccounts(answers.master_password, (accounts: Array<IAccount>) => {
                console.log("accounts", accounts);
            })
        })
    })
    .command('init', 'init password manager', function (yargs) {
        return yargs.demand(0);
    }, (argv: any) => {
        inquirer.prompt([{
            type: 'input',
            name: 'master_password',
            message: 'master password:'
        }]).then((answers: IAnswer) => {
            let arr = [];
            writeFile(answers.master_password, JSON.stringify(arr), (err) => {
                if (err) {
                    console.log("sorry something went wrong");
                } else {
                    console.log('account.json initialized!');
                }
            })
        });
    })
    .demand(1)
    .wrap(72)
    .argv