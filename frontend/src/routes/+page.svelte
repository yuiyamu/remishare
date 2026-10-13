<script lang="ts">
import { onMount } from 'svelte';

//just copied straight from server >.< kinda janky but when you have seperated servers like this ig its easiest
interface fileEntry {
  filename: string;
  serverPath: string;
  dateAdded: string;
  fileSize: string;
  rawFileSize: number;
  timestampAdded: number;
}

interface loginAttempt {
  loginStatus: boolean;
  key?: string;
}

const endpoint = "https://remiapi.yuru.ca";

let currentDomain = $state("");
let currentUser = $state("");
let currentServer = $state("remilia");
let currentServerLocation = $state("chicago")

let fileMap: fileEntry[]; //constant upon page load~
let tableFileMap = $state() as fileEntry[];
let curCopiedLink = $state("");

let notLoggedIn = $state(false);

onMount(() => {
  notLoggedIn = !localStorage.getItem("key");
  if (!notLoggedIn) { //if we do have a key >:3
    currentDomain = `${localStorage.getItem("user")}.yuru.ca`;
    currentUser = localStorage.getItem("user")!;
    (async () => {
      let fileMapData;
      try {
        fileMapData = await fetch(`${endpoint}/readFilemap`, {
          method: 'GET',
          headers: {
            'Authorization': localStorage.getItem("key")!,
            'X-User': localStorage.getItem("user")!
            },
          });
        //this puts it in the global fileMap, but for what we want to do, we need to put this in a temp filemap to work with as well
        fileMap = await fileMapData.json() as fileEntry[];
        tableFileMap = fileMap;

        //when we load the page tho, we usually want to see what was most recently added :p
        changeArrowDirection("date");
      } catch (err: any) {
        console.error(`something went wrong when fetching from our endpoint >.<: ${(err as Error).message}`);
      }
    })();
  }
});

function sortTable(type: string, isDescending: boolean) {
  if (isDescending) {
    switch (type) {
      case "text":
        tableFileMap.sort((a, b) => a.filename.localeCompare(b.filename));
        break;
      case "date":
        tableFileMap.sort((a, b) => a.timestampAdded - b.timestampAdded);
        break;
      case "size":
        tableFileMap.sort((a, b) => a.rawFileSize - b.rawFileSize);
        break;
    }
  } else {
    switch (type) {
      case "text":
        tableFileMap.sort((a, b) => b.filename.localeCompare(a.filename));
        break;
      case "date":
        tableFileMap.sort((a, b) => b.timestampAdded - a.timestampAdded);
        break;
      case "size":
        tableFileMap.sort((a, b) => b.rawFileSize - a.rawFileSize);
        break;
    }
  }
}

let attemptedLoginFailed = $state(false);
let subdomainInput = $state("");
let passwordInput = $state("");
async function attemptLogin() {
  let passwordAttempt = await fetch(`${endpoint}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subdomain: subdomainInput, password: passwordInput }),
  });
  let passwordData = await passwordAttempt.json() as loginAttempt;

  if (passwordData.loginStatus) {
    localStorage.setItem("key", passwordData.key!); //i fucking love cross site scripting ^.^
    localStorage.setItem("user", subdomainInput);
    location.reload();
  } else {
    attemptedLoginFailed = true;
  }
}

async function deleteCurrentFile(fileNum: number) {
  await fetch(`${endpoint}/deleteFile`, {
    method: 'POST',
    headers: {
      'Authorization': localStorage.getItem("key")!,
      'X-User': localStorage.getItem("user")!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileToDelete: fileNum }),
  });

  location.reload(); //get reloaded idiot
}

function logoutCurrentUser() {
  localStorage.clear(); //clears local storage, wiping the user and key :3
  location.reload(); //get reloaded idiot
}

let searchQuery = $state("");
function searchKeyPress() {
  let searchFileMap = [] as fileEntry[];
  fileMap.forEach(file => { //uses the const map
    if (file.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
      searchFileMap.push(file); //adds it to the temp filemap that we use for searches
    }
  });
}

let isShowingUpload = $state(false);
function handleDroppedFile(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();

  let file = event.dataTransfer!.files[0];
  let imageForm = new FormData();
  imageForm.append('file', file);

  uploadFile(imageForm);
}

//handles uploads with the file picker (formSubmit), reloads no matter what happens
function fileSubmit(event: SubmitEvent) {
  let file = new FormData(event.target as HTMLFormElement);
  uploadFile(file);
}

let uploadingFile = $state(false);
let uploadPercent = $state(0);
function uploadFile(file: FormData) {
  uploadingFile = true;
    
  let xhr = new XMLHttpRequest();
  xhr.upload.onprogress = (event) => {
  if (event.lengthComputable) {
    uploadPercent = (event.loaded / event.total)*100;
    }
  }

  xhr.open('POST', `${endpoint}/upload`);
  xhr.setRequestHeader('Authorization', localStorage.getItem("key") ?? '');
  xhr.setRequestHeader('X-User', localStorage.getItem("user") ?? '');
  xhr.send(file);

  xhr.onload = () => {
  if (xhr.status === 200) {
    location.reload(); //reloads after the file is sent properly :3
  }
  }
}

let showClipboardPopup = $state(false);
function copyToClipboard(filename: string) {
  showClipboardPopup = true;
  curCopiedLink = `https://${currentDomain}/${filename}`;
  navigator.clipboard.writeText(curCopiedLink);
}

//stupid functions to make svelte happy
let showFileNameArrow = $state(false);
let showDateAddedArrow = $state(false);
let showSizeArrow = $state(false);
function changeArrowDisplay(show: boolean, type: string) {
  switch (type) {
    case "filename":
      showFileNameArrow = show? true : false;
      break;
    case "date":
      showDateAddedArrow = show? true : false;
      break;
    case "size":
      showSizeArrow = show? true : false;
      break;
  }
}

let fileNameAscending = $state(true);
let dateAddedAscending = $state(true);
let sizeAscending = $state(true);
function changeArrowDirection(type: string) {
  switch (type) {
    case "filename":
      fileNameAscending = !fileNameAscending;
      sortTable("text", fileNameAscending);
      break;
    case "date":
      dateAddedAscending = !dateAddedAscending;
      sortTable("date", dateAddedAscending);
      break;
    case "size":
      sizeAscending = !sizeAscending;
      sortTable("size", sizeAscending);
      break;
  }
}
</script>

<svelte:window ondragover={(e) => {e.preventDefault(); isShowingUpload = true}} ondrop={handleDroppedFile}/>
<div id="background"></div>

<div id="page"> <!-- wait, it's all flexboxes? always has been..... -->
    {#if !notLoggedIn}
    <header id="header">
      <span>uploading to: <span style="color: white;">{currentServer}</span> ({currentServerLocation})</span>
      <span id="header-text">you're using <span style="color: white;">{currentUser}.yuru.ca</span>~</span>
      <span id="logout" onmousedown={() => logoutCurrentUser()}>logout</span>
    </header>
    {/if}

    {#if isShowingUpload}
    <div id="upload-area" class="screen-overlay" style={isShowingUpload? "flex" : "none"}>
      <div id="upload-content">
        <span>drag your file :3</span>
        <div class="upload-divider"></div>
        <p>or, you can upload it with the file picker below:</p>
        <form method="post" enctype="multipart/form-data" id="file-submit-form" onsubmit={fileSubmit}>
          <input type="file" name="file"/>
          <button>upload~ :3</button>
        </form>
        {#if uploadingFile}
            <div id="upload-progress-bar" style="width: {uploadPercent}%"></div><p id="progress-percent">{uploadPercent}%</p>
        {/if}
        <div class="upload-divider"></div>
        <button id="cancel-upload" onclick={() => (isShowingUpload = false)}>cancel</button>
      </div>
    </div>
    {/if}

    {#if notLoggedIn}
    <div id="not-logged-in" class="screen-overlay">
      <div id="log-in-area">
        <h1>you're not currently logged in &gt;_&lt;&#59;&#59;</h1>
        <p>enter your subdomain and password below:</p>
        <div>
          <span>subdomain: </span>
          <input type="username" id="subdomain" bind:value={subdomainInput}/>
        </div>
        <div>
          <span>password: </span>
          <input type="password" id="password" bind:value={passwordInput} onkeydown={(e) => e.key === 'Enter' && attemptLogin()}>
        </div>
        <button id="login-button" onmousedown={() => attemptLogin()}>login</button>
        {#if attemptedLoginFailed} 
            <span id="login-fail" style="color: white;">incorrect login, please try again &gt;_&lt;&#59;&#59;</span>
        {/if}
      </div>
    </div>
    {:else}
    <div id="below-header">
      <section id="left-content">
        <div id="flanstore-info">
          <h1>remishare 📦</h1>
          <p>drop your files anywhere on the page~</p>
          <p>you can also click the button below to do so :3</p>
          <button onclick={() => (isShowingUpload = true)}>upload~ :3</button>
        </div>
      </section>
      <section id="file-display">
        <div id="search-bar">
          <img src="/search.svg" alt="search..." width="22px" height="22px" style="filter: invert(1); margin-left: 8px;"/>
          <input class="search-input" id="search-input" type="text" bind:value={searchQuery} onchange={() => searchKeyPress()}/>
        </div>
        <div id="table-container">
        <table class="file-table">
          <colgroup>
            <col style="width: 50%;">
            <col style="width: 15%;">
            <col style="width: 10%;">
            <col>
          </colgroup>
            <tbody id="table-fill">
            <tr>
            <th onmouseover={() => changeArrowDisplay(true, "filename")} onfocus={() => changeArrowDisplay(true, "filename")} onmouseleave={() => changeArrowDisplay(false, "filename")} onblur={() => changeArrowDisplay(false, "filename")} onclick={() => changeArrowDirection("filename")}>file name 
              {#if showFileNameArrow}<span class="table-sort-arrow">{fileNameAscending? '▲' : '▼'}</span>{/if}
            </th>
            <th onmouseover={() => changeArrowDisplay(true, "date")} onfocus={() => changeArrowDisplay(true, "date")} onmouseleave={() => changeArrowDisplay(false, "date")} onblur={() => changeArrowDisplay(false, "date")} onclick={() => changeArrowDirection("date")}>date added 
              {#if showDateAddedArrow}<span class="table-sort-arrow">{dateAddedAscending? '▲' : '▼'}</span>{/if}
            </th>
            <th onmouseover={() => changeArrowDisplay(true, "size")} onfocus={() => changeArrowDisplay(true, "size")} onmouseleave={() => changeArrowDisplay(false, "size")} onblur={() => changeArrowDisplay(false, "size")} onclick={() => changeArrowDirection("size")}>size 
              {#if showSizeArrow}<span class="table-sort-arrow">{sizeAscending? '▲' : '▼'}</span>{/if}
            </th>
            <th style="border-right: none;">url</th>
          </tr>
            {#each tableFileMap as curFile, i}
                <tr class={i % 2 === 0? "table-element-odd" : "table-element-even"}>
                    <td class={i % 2 === 0? "table-element-odd" : "table-element-odd"}>
                        <span class="filename">{curFile.filename}</span>
                    </td>
                    <td>{curFile.dateAdded}</td>
                    <td>{curFile.fileSize}</td>
                    <td style="border-right: none; display: flex; justify-content: space-between">
                        <a href="https://{currentDomain}/{curFile.serverPath}">{curFile.serverPath}</a>
                        <div>
                            <img src="/copy.svg" alt="cp" onmousedown={() => copyToClipboard(curFile.serverPath)} width="16px" height="16px" style="margin-right: 2px; cursor: pointer; filter: invert(79%) sepia(8%) saturate(250%) hue-rotate(197deg) brightness(93%) contrast(88%);">
                            <img src="/trash.svg" alt="rm" onmousedown={() => (deleteCurrentFile(i))}  width="16px" height="16px" style="margin-right: 2px; cursor: pointer; filter: invert(79%) sepia(8%) saturate(250%) hue-rotate(197deg) brightness(93%) contrast(88%);">
                        </div>
                    </td>
                </tr>
            {/each}
            </tbody>
        </table>
        </div>
      </section>
    </div>
    {/if}
</div>

<div id="alert-area">
  {#if showClipboardPopup}
    <div class="copy-alert">
      <h3>copied <a href={curCopiedLink}>{curCopiedLink}</a> to clipboard! &gt;w&lt;</h3>
    </div>
  {/if}
</div>

<style>
/* globals */
@font-face { font-family: Zen Kaku Gothic New; src: url('/ZenKakuGothicNew.woff2') format('woff2')}

:root {
    --focus: #c17342;
    --unfocus: #c1ae42;
    --text: #b4b5bf;
    --link: #646570;
    --background: #282828;
}

:global(body) {
    background-color: #282828;
    color: var(--text);
    font-family: "Zen Kaku Gothic New", sans-serif;
    font-size: 16px;
    margin: 0;
    text-align: center;
}

a {
    color: white;
    text-decoration: none;
}

button {
    cursor: pointer;
    background-color: var(--focus);
    color: white;
    border: none;
    padding: 8px 18px;
    text-decoration: none;
}

input[type=text], input[type=username], input[type=password] {
    border-color: var(--unfocus);
    background-color: transparent;
    color: white;
} input[type=text]:focus, input[type=username]:focus, input[type=password]:focus {
    outline: none;
}

/* bg/global overlays */
#background {
    height: 100vh;
    width: 100vw;
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
    background-size: cover;
    background-position: center;
    background-image: url('/remi.webp');
}

.screen-overlay {
    display: flex;
    position: absolute;
    height: 100vh;
    width: 100vw;
    top: 0;
    left: 0;
    z-index: 1;
    justify-content: center;
    align-items: center; /* defaults to assuming it's flex~ */
}

#page {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

/* upload overlay */
#upload-area {
    /* flex when opened with js */
    z-index: 1;
}

.upload-divider {
    background-color: gray;
    width: 500px;
    height: 2px;
    margin-top: 10px;
    margin-bottom: 10px;
}

#upload-progress-bar {
    background-color: var(--focus);
    height: 10px;
    margin-top: 20px;
    margin-bottom: 20px;
}

/* login page */
#log-in-area {
    display: grid;
}

#login-button {
    margin-top: 20px;
}

/* header */
header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 52px;
    margin-left: 20px;
    margin-right: 20px;
}

#logout {
    color: white;
    margin-right: 10px;
    cursor: pointer;
}

#below-header {
    display: flex;
    height: calc(100% - 52px);
}

#header-text {
  padding-right: 140px; /* kinda wish i didnt need something like this bullshit but oh well */
}

#left-content {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50%;
}

#flanstore-info {
    margin-bottom: 56px;
}

/* file table.. gulp... */
#file-display {
    position: relative;
    border: 2px solid var(--focus);
    height: calc(100% - 14px);
    width: 50%;
    margin-right: 10px;
}

#search-bar {
    display: flex;
    align-items: center;
    width: 100%;
    height: 50px;
    border-bottom: 2px solid var(--unfocus);
}

.search-input {
    margin-left: 10px;
    width: 72%;
    border: none;
}

#search-input {
    font-size: 22px;
}

#table-container {
    position: absolute; /* i absolutely hate that this works. */
    top: 50px;
    left: 0;
    height: calc(100% - 50px);
    overflow-y: scroll;
    scrollbar-width: none;
}

.file-table {
    table-layout: fixed; /* UNLUCKY but what i have to do for the sexy ellipses */
    border-collapse: collapse;
    width: 100%;
} .file-table th {
    color: white;
    border-bottom: 1px solid var(--unfocus);
    border-right: 1px solid var(--unfocus);
    font-weight: normal;
    overflow: hidden;
    padding: 10px 5px;
    word-break: normal;
    cursor: pointer;
} .file-table td {
    border-bottom: 1px solid var(--unfocus);
    border-right: 1px solid var(--unfocus);
    overflow: hidden;
    padding: 10px 5px;
    word-break: normal;
} .file-table .table-element-odd {
    text-align: left;
    vertical-align: top
} .file-table .table-element-even {
    background-color: rgba(226, 204, 158, 0.15);
    text-align: left;
    vertical-align: top
}

#table-fill {
    max-height: calc(100vh - 56px - 20px - 50px - 44.5px);
    /* first part is the file display height, then minus the search bar and top bar height. the last one i'm not completely sure about working 100% */
    overflow-y: scroll;
}

.table-sort-arrow {
    font-size: 12px;
    color:rgba(232, 198, 148, 0.25);
}

#alert-area {
    position: absolute;
    bottom: 2vh;
    left: 0px;
    height: 50px;
    width: 40%;
    margin-left: 30%;
    margin-right: 30%; /* i love centering */
}

.copy-alert {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: rgba(231, 196, 143, 0.158);
    backdrop-filter: blur(5px);
    border: 2px solid var(--focus);

    opacity: 0;
	animation-name: alertFade;
	animation-iteration-count: 1;
	animation-timing-function: ease-in;
	animation-duration: 2.5s;
} @keyframes alertFade {
	0% { opacity: 0; }
    5% { opacity: 1; }
    80% { opacity: 1; }
	100% { opacity: 0; }
}

.filename {
    display: block;
    margin: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    height: 24px; /* table is 24px tall :3 */
}

@media only screen and (max-device-width: 1000px)
{
    #below-header {
        flex-direction: column;
    }

    #flanstore-info {
        margin-bottom: 40px;
    }

    #left-content {
        width: 100%;
        height: auto;
    }

    #file-display {
        width: calc(100% - 24px);
        margin-left: 10px;
        margin-right: 10px;
    }

    #header-text {
        display: none;
    }
}
</style>