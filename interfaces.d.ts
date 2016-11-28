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

interface Isession {
    default_file: string;
    answer_password: IAnswerPassword | null;
    parsed_accounts: Array<IAccount> | null;
}