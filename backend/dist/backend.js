"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const crypto = __importStar(require("node:crypto"));
const node_http_1 = __importDefault(require("node:http"));
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const port = 1402; /* <3 */
const mainServer = node_http_1.default.createServer(app);
const userServer = node_http_1.default.createServer(app);
mainServer.listen(1402, () => console.log(`flanstore server - port 1402~`));
userServer.listen(1414, () => console.log(`flanstore file server - port 1402~`));
app.use((0, cors_1.default)()); //make cors shut the FUCK up :3
app.use(express_1.default.json()); //parsing messages in json because json is cool and sick
app.use(express_1.default.urlencoded({ extended: true })); //lowkey don't know what this does but yeah sure whatever man
var userInfo = JSON.parse(fs.readFileSync('./userinfo.json', { encoding: 'utf8' }));
userInfo.forEach(user => {
    let userPathExists = fs.existsSync(`./files/${user.subdomain}/filemap.json`);
    if (!userPathExists) {
        console.log(`created directory for ${user.subdomain} at ./files/${user.subdomain}/filemap.json >w<`);
        fs.mkdirSync(`./files/${user.subdomain}`); //first, we have to make the directory here
        fs.writeFileSync(`./files/${user.subdomain}/filemap.json`, "[]", 'utf8'); //just writes [] to the filepath to create filemap.json
    }
});
app.use(express_1.default.static(`./api`)); //serves everything in the api folder, which for now is just user pfps :3
var lastFileName = '';
var originalFileName = '';
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        //verify not needed, comes later~
        let user = req.headers["x-user"];
        cb(null, `./files/${user}`);
    },
    filename: (req, file, cb) => {
        //first, checking if we have permission to upload the file
        let apiKey = req.headers["authorization"];
        let user = req.headers["x-user"];
        let isValid = verifyApiRequest(user, apiKey);
        if (isValid) {
            let ext = path.extname(file.originalname);
            originalFileName = file.originalname;
            lastFileName = Math.random().toString(36).slice(2) + ext; //current format is just a random string + .ext
            cb(null, lastFileName);
        }
    },
});
const upload = (0, multer_1.default)({ storage });
function updateMapFile(subdomain, userFileMap) {
    fs.writeFile(`./files/${subdomain}/filemap.json`, JSON.stringify(userFileMap, null, 4), 'utf8', (err) => {
        if (err) {
            console.error(`there was an error writing to the filemap for ${subdomain}:`, err);
            return;
        }
    });
}
function verifyApiRequest(subdomain, apiKey) {
    let isValid = false;
    userInfo.forEach(user => {
        if (user.subdomain === subdomain) {
            if (user.key === apiKey) {
                isValid = true;
            }
        }
    });
    return isValid;
}
function fileSizeString(size) {
    let sizeSuffix = "bytes";
    for (let i = 0; i < 3; i++) {
        if (size / 1000 > 1) {
            size = size / 1000;
            switch (i) {
                case 0:
                    sizeSuffix = "kB";
                    break;
                case 1:
                    sizeSuffix = "MB";
                    break;
                case 2:
                    sizeSuffix = "GB"; //i sure hope nobody uploads something as big as a terabyte....
                    break;
            }
        }
    }
    return `${Math.round(size * 100) / 100} ${sizeSuffix}`;
}
app.post('/upload', upload.single('file'), async (req, res) => {
    let user = req.headers["x-user"];
    //if we're not using the normal file path, don't bother adding it to the file map :3
    //this checks both for the default file map, as well as if it's not defined
    let currentTime = new Date();
    let fileAddedDate = `${currentTime.getUTCMonth() + 1}/${currentTime.getUTCDate()}/${currentTime.getUTCFullYear()}`; //uses MM/DD/YYYY, but this gets changed later with a setting~
    //once we have a valid upload, then we want to start messing with the fileMap~
    let fileMap = JSON.parse(fs.readFileSync(`./files/${user}/filemap.json`, { encoding: 'utf8' }));
    let stats = fs.statSync(`./files/${user}/${lastFileName}`); //since we've saved the file already, stats are here!! :D
    let fileSize = fileSizeString(stats.size);
    fileMap.push({
        filename: originalFileName,
        serverPath: lastFileName,
        dateAdded: fileAddedDate,
        fileSize: fileSize,
        rawFileSize: stats.size,
        timestampAdded: currentTime.getTime()
    }); //finally, we can save everything~
    updateMapFile(user, fileMap);
    res.send(`https://${user}.yuru.ca/${fileMap[fileMap.length - 1].serverPath}`); //sends the url back, since sharex copies the response to clipboard~
});
app.post('/deleteFile', async (req, res) => {
    let apiKey = req.headers["authorization"];
    let user = req.headers["x-user"];
    let isValid = verifyApiRequest(user, apiKey);
    if (isValid) {
        let fileMap = JSON.parse(fs.readFileSync(`./files/${user}/filemap.json`, { encoding: 'utf8' }));
        let deleteFile = req.body;
        fs.unlinkSync(`./files/${user}/${fileMap[deleteFile.fileToDelete].serverPath}`);
        fileMap.splice(deleteFile.fileToDelete, 1);
        updateMapFile(user, fileMap);
        res.send({ "response": "deleted file successfully~ :3" });
    }
    else {
        res.send({ "response": "could not verify api key >_<" });
    }
});
app.get('/prevFilename', (req, res) => {
    res.send({ "name": lastFileName });
});
app.get('/readFilemap', (req, res) => {
    let apiKey = req.headers["authorization"];
    let user = req.headers["x-user"];
    let isValid = verifyApiRequest(user, apiKey);
    if (isValid) {
        let fileMap = JSON.parse(fs.readFileSync(`./files/${user}/filemap.json`, { encoding: 'utf8' }));
        fileMap.forEach(file => {
            file.dateAdded = `${file.dateAdded.split('/')[1]}/${file.dateAdded.split('/')[0]}/${file.dateAdded.split('/')[2]}`; //makes the date anne compliant. anne certification type shit 
        });
        res.send(fileMap);
    }
    else {
        res.send({ "response": "could not verify api key >_<" });
    }
});
app.get('/', (req, res) => {
    res.redirect('https://flanstore.yuru.ca'); //redirects anyone who just goes to a base url :3 i think this is neat~
});
app.post('/login', (req, res) => {
    let loginDetails = req.body; //already sent as a json
    let userPass;
    let userSalt;
    let userKey;
    userInfo.forEach(user => {
        if (user.subdomain === loginDetails.subdomain) {
            userPass = user.password;
            userSalt = user.saltge;
            userKey = user.key;
        }
    });
    let loginToHash = loginDetails.password + userSalt;
    let hashPwd = crypto.createHash('sha256').update(loginToHash).digest('hex');
    if (hashPwd === userPass) {
        res.send({ loginStatus: true, key: userKey });
    }
    else {
        res.send({ loginStatus: false });
    }
});
app.get('/:fileid', (req, res) => {
    if (req.socket.localPort === 1414) {
        let fileId = req.params.fileid;
        let subdomain = req.hostname.split('.')[0];
        let fileMap = JSON.parse(fs.readFileSync(`./files/${subdomain}/filemap.json`, { encoding: 'utf8' }));
        let originalFileIndex = fileMap.findIndex(file => file.serverPath === fileId);
        if (originalFileIndex === -1) {
            res.status(500).send(`couldn't find file on server >_<;; `);
        }
        res.setHeader('Content-Disposition', `inline; filename="${fileMap[originalFileIndex].filename}"`);
        res.sendFile(`./files/${subdomain}/${fileId}`, { root: '.' });
    }
});
