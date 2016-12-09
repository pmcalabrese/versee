# Versee
Versee is an Interactive CLI Password Manager written in Typescript and powered by NodeJS. versee was developed, because I needed a simple yet powerfull password manager with the following features:

- File based
- Secure with AES256
- Open source
- OS agnostic
- Simple to use and (few commands)
- Command Line Interface
- No embedded mechanisms for share password (you can choose your own, for example Dropbox SugarSync or whatever)

## Install

Versee is written in Typescript and powered by in NodeJS. If you do not have it already you can install from [NodeJS website](https://nodejs.org/en/) .

    npm install versee -g

## Getting started

After install it you can launch a versee session simply by typing
    
    versee

now you are in versee session, here you can type commands. We will start to type ``` help ``` for show the list of availble commands. Now let's create a new file called *personal_credentials* that will hold our personal username password for our social logins (we will refer to credentials as douple of username and passwords). Move to the folder you want to keep the file (let's say the home folder) and type:

    init personal_credentials

we are prompt to type the master password. The **master password** will be used for encrypt the file that will contains the credentials.
Warning at this time there is no check about for the strength of the password but is *strongly* suggested to choose a long and an hard to guess password. Morover if you forget the password the only way to decrypt the file is brute force it (try to input passwords until it find the right one), and could theorically be a impossible, or anyway a very hard task. At this time there are no mechanisms for fight against bruteforcing, but few methods are in consideration.

After init a file we can start to add some credentials with the command ```add``` for example let's add a facebook credentials, let's type:

    add facebook

we are asked to enter the master_password. After enter the master password we can enter _username_ and _password_ of our facebook account, which will be stored in the file that we just init. Let's add one more for example twitter

    add twitter

We notice that this time versee did not asked our master password. This because versee remembers the password (in memory) during the session, so you do not have to type for every operation. Let's list the credentials that we have stored. List **will not show the password for security reasons**. If you want to show the password of one account you can use the command `search`. For example `search facebook`.

    list

Let's say we want to share some credentials with our collegues. Let's init one more file that we will share over Dropbox. Let's type:

    init office_credentials

Now we just created another encrypted file with another master password which will contains only the credentials that we will share with our collegues. In one session you can switch over files with the command ```switch```. For example

    switch personal_credentials

it will switch to use our personal_credentials file. If you loose track on which file you are using you can type:

    which

If you want to quit versee just type `exit`.



