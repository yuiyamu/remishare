import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import http from 'node:http';
import express from "express";
import multer from "multer";
import cors from "cors";

const app = express();
const port = 1402; /* <3 */

const mainServer = http.createServer(app);
const userServer = http.createServer(app);
mainServer.listen(1402, () => console.log(`remishare server - port 1402~`));
userServer.listen(1414, () => console.log(`remishare file server - port 1414~`));

app.use(cors()); //make cors shut the FUCK up :3
app.use(express.json()); //parsing messages in json because json is cool and sick
app.use(express.urlencoded({ extended: true })); //lowkey don't know what this does but yeah sure whatever man

var userInfo = JSON.parse(fs.readFileSync('./userinfo.json', {encoding: 'utf8'})) as user[];
userInfo.forEach(user => {
    let userPathExists = fs.existsSync(`./files/${user.subdomain}/filemap.json`);
    if (!userPathExists) {
        console.log(`created directory for ${user.subdomain} at ./files/${user.subdomain}/filemap.json >w<`);
        fs.mkdirSync(`./files/${user.subdomain}`); //first, we have to make the directory here
        fs.writeFileSync(`./files/${user.subdomain}/filemap.json`, "[]", 'utf8'); //just writes [] to the filepath to create filemap.json
    }
});
app.use(express.static(`./api`)); //serves everything in the api folder, which for now is just user pfps :3

var lastFileName = '';
var originalFileName = '';
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        //verify not needed, comes later~
        let user = req.headers["x-user"] as string;
        cb(null, `./files/${user}`);
    },
    filename: (req, file, cb) => {
        //first, checking if we have permission to upload the file
        let apiKey = req.headers["authorization"] as string;
        let user = req.headers["x-user"] as string;
        let isValid = verifyApiRequest(user, apiKey);

        if (isValid) {
            let ext = path.extname(file.originalname);
            originalFileName = file.originalname;
            lastFileName = Math.random().toString(36).slice(2)+ext; //current format is just a random string + .ext
            cb(null, lastFileName);
        }
    },
});

const upload = multer({ storage });

function updateMapFile(subdomain: string, userFileMap: fileEntry[]) {
    fs.writeFile(`./files/${subdomain}/filemap.json`, JSON.stringify(userFileMap, null, 4), 'utf8', (err) => {
        if (err) {
          console.error(`there was an error writing to the filemap for ${subdomain}:`, err);
          return;
        }
    });
}

function verifyApiRequest(subdomain: string, apiKey: string) {
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

function fileSizeString(size: number) {
    let sizeSuffix = "bytes";
    for (let i = 0; i < 3; i++) {
        if (size/1000 > 1) {
            size = size/1000;
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
    return `${Math.round(size*100)/100} ${sizeSuffix}`;
}

app.post('/upload', upload.single('file'), async (req, res) => { //file gets saved here, with upload.single
    let user = req.headers["x-user"] as string;
    //if we're not using the normal file path, don't bother adding it to the file map :3
    //this checks both for the default file map, as well as if it's not defined

    let currentTime = new Date();
    let fileAddedDate = `${currentTime.getUTCMonth()+1}/${currentTime.getUTCDate()}/${currentTime.getUTCFullYear()}`; //uses MM/DD/YYYY, but this gets changed later with a setting~
    //once we have a valid upload, then we want to start messing with the fileMap~
    let fileMap = JSON.parse(fs.readFileSync(`./files/${user}/filemap.json`, {encoding: 'utf8'}));
    let stats = fs.statSync(`./files/${user}/${lastFileName}`); //since we've saved the file already, stats are here!! :D
    let fileSize = fileSizeString(stats.size);
    fileMap.push({
        filename: originalFileName,
        serverPath: lastFileName,
        dateAdded: fileAddedDate,
        fileSize: fileSize,
        rawFileSize: stats.size,
        timestampAdded: currentTime.getTime()}); //finally, we can save everything~
    updateMapFile(user, fileMap);

    res.send(`https://${user}.yuru.ca/${fileMap[fileMap.length-1].serverPath}`); //sends the url back, since sharex copies the response to clipboard~
});

app.post('/deleteFile', async (req, res) => {
    let apiKey = req.headers["authorization"] as string;
    let user = req.headers["x-user"] as string;
    let isValid = verifyApiRequest(user, apiKey);
    if (isValid) {
        let fileMap = JSON.parse(fs.readFileSync(`./files/${user}/filemap.json`, {encoding: 'utf8'}));
        let deleteFile = req.body;
        fs.unlinkSync(`./files/${user}/${fileMap[deleteFile.fileToDelete].serverPath}`);
        fileMap.splice(deleteFile.fileToDelete, 1);
        updateMapFile(user, fileMap);
        res.send({"response":"deleted file successfully~ :3"});
    } else {
        res.send({"response":"could not verify api key >_<"});
    }
});

app.get('/prevFilename', (req, res) => {
    res.send({"name":lastFileName});
});

app.get('/readFilemap', (req, res) => {
    let apiKey = req.headers["authorization"] as string;
    let user = req.headers["x-user"] as string;
    let isValid = verifyApiRequest(user, apiKey);
    if (isValid) {
        let fileMap = JSON.parse(fs.readFileSync(`./files/${user}/filemap.json`, {encoding: 'utf8'})) as fileEntry[];
        fileMap.forEach(file => {
            file.dateAdded = `${file.dateAdded.split('/')[1]}/${file.dateAdded.split('/')[0]}/${file.dateAdded.split('/')[2]}`; //makes the date anne compliant. anne certification type shit 
        });
        res.send(fileMap);
    } else {
        res.send({"response":"could not verify api key >_<"});
    }
});

app.get('/', (req, res) => {
    res.redirect('https://remi.yuru.ca'); //redirects anyone who just goes to a base url :3 i think this is neat~
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
    let loginToHash = loginDetails.password+userSalt;

    let hashPwd = crypto.createHash('sha256').update(loginToHash).digest('hex');
    if (hashPwd === userPass) {
        res.send({loginStatus: true, key: userKey});
    } else {
        res.send({loginStatus: false});
    }
});

app.get('/:fileid', (req, res) => {
  if (req.socket.localPort === 1414 ) {
    let fileId = req.params.fileid;
    let subdomain = req.hostname.split('.')[0];
    let fileMap = JSON.parse(fs.readFileSync(`./files/${subdomain}/filemap.json`, {encoding: 'utf8'})) as fileEntry[];
    let originalFileIndex = fileMap.findIndex(file => file.serverPath === fileId);

    if (originalFileIndex === -1) {
        res.status(500).send(`couldn't find file on server >_<;; `);
    }

    res.setHeader('Content-Disposition', `inline; filename="${fileMap[originalFileIndex].filename}"`);
    res.sendFile(`./files/${subdomain}/${fileId}`, { root: '.' });
  }
});
