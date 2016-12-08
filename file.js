"use strict";
const fs = require('fs');
const _ = require('lodash');
const crypto = require('crypto');
const Table = require('easy-table');
class File {
    constructor() {
        this._default_file = "default.versee";
        this.sessions = [];
    }
    get default_file() {
        return this._default_file;
    }
    set default_file(newFile) {
        this._default_file = newFile;
    }
    decryptText(text, password) {
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
    encryptText(text, password) {
        const cipher = crypto.createCipher('aes256', password);
        let encrypted = cipher.update(text, 'utf8', 'binary');
        encrypted += cipher.final('binary');
        return encrypted;
    }
    read(password, cb, vcb) {
        if (password.trim() === '') {
            console.log("the master password cannot be empty");
            vcb();
            return;
        }
        fs.readFile(this.default_file, (err, accounts) => {
            if (err) {
                console.log(this.default_file + " file does not exist, try:\nworkon <your file>");
                vcb();
                return;
            }
            let parsed_accounts = [];
            if (accounts && accounts.byteLength !== 0) {
                parsed_accounts = JSON.parse(this.decryptText(accounts.toString(), password));
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
    write(password, data, cb) {
        fs.writeFile(this.default_file, this.encryptText(data, password), (err) => {
            cb(err);
        });
    }
    accountExist(parsed_accounts, account) {
        return (_.findIndex(parsed_accounts, { account: account }) !== -1);
    }
    removeAccount(master_password, parsed_accounts, answers) {
        _.remove(parsed_accounts, { account: answers.account });
        let modified_data = JSON.stringify(parsed_accounts);
        this.write(master_password, modified_data, (err) => {
            if (err)
                throw err;
        });
    }
    addAccount(master_password, parsed_accounts, answers) {
        parsed_accounts.push(answers);
        let modified_data = JSON.stringify(parsed_accounts);
        this.write(master_password, modified_data, (err) => {
            if (err)
                throw err;
        });
    }
    editAccount(master_password, parsed_accounts, answers) {
        let i = _.findIndex(parsed_accounts, { account: answers.account });
        parsed_accounts[i] = answers;
        let modified_data = JSON.stringify(parsed_accounts);
        this.write(master_password, modified_data, (err) => {
            if (err)
                throw err;
        });
    }
    listByAccount(master_password, parsed_accounts, account_to_find, cb) {
        let filtered_parsed_accounts = _.filter(parsed_accounts, (account) => {
            return _.includes(account.account, account_to_find);
        });
        return cb(filtered_parsed_accounts);
    }
    isMasterPasswordCorrect(inquirer, cb, vcb) {
        let session = _.find(this.sessions, { default_file: this.default_file });
        if (session && session.answer_password && session.parsed_accounts) {
            cb(session.answer_password, session.parsed_accounts);
            return;
        }
        inquirer.prompt([{
                type: 'password',
                name: 'master_password',
                message: 'master password:'
            }]).then((answer_password) => {
            this.read(answer_password.master_password, (parsed_accounts) => {
                this.sessions.push({
                    default_file: this.default_file,
                    answer_password: answer_password,
                    parsed_accounts: parsed_accounts
                });
                cb(answer_password, parsed_accounts);
            }, vcb);
        });
    }
    print(accounts, show_password = false) {
        var t = new Table;
        accounts.forEach(function (account) {
            t.cell('Account', account.account);
            t.cell('Username', account.username);
            t.cell('Password', show_password ? account.password : '**********************');
            t.newRow();
        });
        console.log(t.toString());
    }
    exist(path_file) {
        return new Promise((resolve, reject) => {
            if (!path_file) {
                resolve(this.default_file);
            }
            fs.stat(path_file, (err, stat) => {
                if (err == null) {
                    this.default_file = path_file;
                    resolve(this.default_file);
                }
                else if (err.code == 'ENOENT') {
                    console.log(path_file + " file does not exist, try:\nworkon <your file>");
                    reject();
                }
                else {
                    console.log('Something went wrong: ', err.code);
                    reject();
                }
            });
        });
    }
}
let f = new File();
module.exports = f;
