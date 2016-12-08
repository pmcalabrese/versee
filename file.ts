/*

/Users/mca/dev/nopy/file.js:138
                    this.default_file = path_file;
                                      ^

TypeError: Cannot set property 'default_file' of null
    at /Users/mca/dev/nopy/file.js:138:39
    at FSReqWrap.oncomplete (fs.js:123:15)

*/

import * as fs from 'fs';
import * as _ from 'lodash';
import * as crypto from 'crypto';
const Table = require('easy-table');

class File {
    private _default_file = "default.versee";
    sessions: Array<Isession> = [];

    get default_file(): string {
        return this._default_file;
    }

    set default_file(newFile: string) {
        this._default_file = newFile;
    }

    decryptText(text: string, password: string) {
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

    public encryptText(text: string, password: string) {
        const cipher = crypto.createCipher('aes256', password);
        let encrypted = cipher.update(text, 'utf8', 'binary');
        encrypted += cipher.final('binary');
        return encrypted;
    }

    read(password: string, cb: Function, vcb) {
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
            let parsed_accounts: Array<IAnswer> = [];
            if (accounts && accounts.byteLength !== 0) {
                parsed_accounts = JSON.parse(this.decryptText(accounts.toString(), password));
                if (parsed_accounts) {
                    cb(parsed_accounts);
                } else {
                    vcb();
                    return;
                }
            }
        });
    }

    write(password: string, data: string, cb: Function) {
        fs.writeFile(this.default_file, this.encryptText(data, password), (err) => {
            cb(err);
        });
    }

    accountExist(parsed_accounts: Array<IAccount>, account: IAccount) {
        return (_.findIndex(parsed_accounts, { account: account }) !== -1);
    }

    removeAccount(master_password: string, parsed_accounts: Array<IAccount>, answers: IAccount) {
        _.remove(parsed_accounts, { account: answers.account });
        let modified_data = JSON.stringify(parsed_accounts);
        this.write(master_password, modified_data, (err) => {
            if (err) throw err;
        });
    }

    addAccount(master_password: string, parsed_accounts: Array<IAccount>, answers: IAccount) {
        parsed_accounts.push(answers)
        let modified_data = JSON.stringify(parsed_accounts);
        this.write(master_password, modified_data, (err) => {
            if (err) throw err;
        });
    }

    editAccount(master_password: string, parsed_accounts: Array<IAccount>, answers: IAccount) {
        let i = _.findIndex(parsed_accounts, { account: answers.account });
        parsed_accounts[i] = answers;
        let modified_data = JSON.stringify(parsed_accounts);
        this.write(master_password, modified_data, (err) => {
            if (err) throw err;
        });
    }

    listByAccount(master_password: string, parsed_accounts: Array<IAccount>, account_to_find: string, cb: Function) {
        let filtered_parsed_accounts = _.filter(parsed_accounts, (account: IAccount) => {
            return _.includes(account.account, account_to_find);
        })
        return cb(filtered_parsed_accounts as Array<IAccount>);
    }

    isMasterPasswordCorrect(inquirer, cb: AnswerPasswordFunc, vcb) {
        let session = _.find(this.sessions, { default_file: this.default_file });
        if (session && session.answer_password && session.parsed_accounts) {
            cb(session.answer_password, session.parsed_accounts);
            return;
        }
        inquirer.prompt([{
            type: 'password',
            name: 'master_password',
            message: 'master password:'
        }]).then((answer_password: IAnswerPassword) => {
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

    print(accounts: Array<IAccount>, show_password = false) {
        var t = new Table;

        accounts.forEach(function (account) {
            t.cell('Account', account.account);
            t.cell('Username', account.username);
            t.cell('Password', show_password ? account.password : '**********************');
            t.newRow();
        })

        console.log(t.toString());
    }

    exist(path_file: string) {
        return new Promise((resolve, reject) => {
            if (!path_file) {
                resolve(this.default_file);
            }
            fs.stat(path_file, (err, stat) => {
                if (err == null) {
                    this.default_file = path_file; // here
                    resolve(this.default_file);
                } else if (err.code == 'ENOENT') {
                    console.log(path_file + " file does not exist, try:\nworkon <your file>");
                    reject();
                } else {
                    console.log('Something went wrong: ', err.code);
                    reject();
                }
            });
        });
    }
}

let f = new File();

export = f;