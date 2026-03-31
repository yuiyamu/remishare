declare global {
    interface user {
        subdomain: string;
        saltge: string;
        password: string;
        key: string;
    }

    interface fileEntry {
        filename: string;
        serverPath: string;
        dateAdded: string;
        fileSize: string;
        rawFileSize: number;
        timestampAdded: number;
    }
}

export { user, fileEntry }