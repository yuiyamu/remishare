<script lang="ts">
import { onMount } from 'svelte';
import remi from '$lib/remi.jpg';

var notLoggedIn = $state(true);
onMount(() => {
    notLoggedIn = !localStorage.getItem("key");
    console.log(`logged in: ${notLoggedIn}`);
});

const endpoint = "http://localhost:1402";
var currentDomain = $state("");
var fileMap: fileEntry[];
var tableFileMap: fileEntry[];
var curCopiedLink: string;

function sortTable(type: string) {
  if (true) {
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

var attemptedLoginFailed = $state(false);
var subdomainInput = $state("");
var passwordInput = $state("");
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

if (!notLoggedIn) { //if we do have a key >:3
    currentDomain = `${localStorage.getItem("user")}.yuru.ca`;
    (async () => {
        fillTable(null!);
    })();
}

async function deleteCurrentFile(fileNum: number) {
        await fetch(`${endpoint}/deleteFile`, {
            method: 'POST',
            headers: {
                'Authorization': localStorage.getItem("key") ?? '',
                'X-User': localStorage.getItem("user") ?? '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileToDelete: fileNum }),
        });
        location.reload(); //get reloaded idiot
    }

async function fillTable(searchMap?: fileEntry[]) {
    if (!searchMap) {
        let fileMapData;
        try {
            fileMapData = await fetch(`${endpoint}/readFilemap`, {
                method: 'GET',
                headers: {
                    'Authorization': localStorage.getItem("key") ?? '',
                    'X-User': localStorage.getItem("user") ?? ''
                },
            });

            tableFileMap = await fileMapData.json() as fileEntry[]; //this puts it in the global fileMap, but for what we want to do, we need to put this in a temp filemap to work with as well
        } catch (err: any) {
            console.log(`something went wrong when fetching from our endpoint >.<: ${(err as Error).message}`);
        }
    } else {
      tableFileMap = searchMap;
    }
  }

  function logoutCurrentUser() {
    localStorage.clear(); //clears local storage, wiping the user and key :3
    location.reload(); //get reloaded idiot
  }

  var searchQuery = $state("");
  function searchKeyPress() {
    let searchFileMap = [] as fileEntry[];
    fileMap.forEach(file => {
      if (file.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
        searchFileMap.push(file); //adds it to the temp filemap that we use for searches
      }
    });
    fillTable(searchFileMap); //fills the table, but uses this temp filemap
  }

  var showFileNameArrow = $state(false);
  var showDateAddedArrow = $state(false);
  var showSizeArrow = $state(false);
  var showUrlArrow = $state(false);

  /* preventing default drop actions */
  //        e.preventDefault();
  //      e.stopPropagation();
  var isShowingUpload = $state(false);
  function handleDroppedFile() {
      //let file = e.dataTransfer.files[0];
      //let imageForm = new FormData();
      //imageForm.append('file', file);

      //uploadFile(imageForm);
  }

  //handles uploads with the file picker (formSubmit), reloads no matter what happens
  function fileSubmit() {
    //let file = new FormData(e.target);
    //uploadFile(file);
  }

  var uploadingFile = $state(false);
  var uploadPercent = $state(0);
  function uploadFile(file) {
    uploadingFile = true;
    
    let xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        uploadPercent = (event.loaded / event.total)*100;
      }
    };

    xhr.open('POST', `${endpoint}/upload`);
    xhr.setRequestHeader('Authorization', localStorage.getItem("key") ?? '');
    xhr.setRequestHeader('X-User', localStorage.getItem("user") ?? '');
    xhr.send(file);

    xhr.onload = () => {
      if (xhr.status === 200) {
        location.reload(); //reloads after the file is sent properly :3
      }
    };
  }
</script>

<svelte:window
    ondragover={() => isShowingUpload = true}
    ondrop={() => handleDroppedFile()}
/>

<div id="background" style="background: url({remi})"></div>
  <div id="body">
    <header id="header">
      <p id="header-text">hello, <span id="page-url">{currentDomain}</span>!</p>
      <div id="logout-area">
        <span id="logout" onmousedown={() => logoutCurrentUser()}>logout</span>
        <img id="user-pfp">
      </div>
    </header>
    {#if isShowingUpload}
    <div id="upload-area" class="screen-overlay" style={isShowingUpload? "flex" : "none"}>
      <div id="upload-content">
        <span>drag your file :3</span>
        <div class="upload-divider"></div>
        <p>or, you can upload it with the file picker below:</p>
        <form method="post" enctype="multipart/form-data" id="file-submit-form" onsubmit={() => fileSubmit()}>
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
          <span>password: </span> <!-- also when this is enter -->
          <input type="password" id="password" bind:value={passwordInput}>
        </div>
        <button id="login-button" onmousedown={() => attemptLogin()}>login</button>
        {#if attemptedLoginFailed} 
            <br><span id="login-fail">incorrect login, please try again &gt;_&lt;&#59;&#59;</span>
        {/if}
        <span>(you can only get one if you're our oomf &gt;.&lt;)</span>
      </div>
    </div>
    {/if}
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
          <i class="fa fa-search" style="font-size: 22px; color: white; margin-left: 5px;"></i>
          <input class="search-input" id="search-input" type="text" bind:value={searchQuery} onchange={() => searchKeyPress()}/>
        </div>
        <table class="file-table">
          <colgroup>
            <col style="width: 50%;">
            <col style="width: 15%;">
            <col style="width: 10%;">
            <col>
          </colgroup>
            <tbody id="table-fill">
            <tr>
            <th id="file-name" onmouseover={() => (showFileNameArrow = true)} onclick={() => sortTable("text")}>file name 
              {#if showFileNameArrow}<span class="table-sort-arrow">▲</span>{/if}
            </th>
            <th id="date-added" onmouseover={() => (showDateAddedArrow = true)} onclick={() => sortTable("date")}>date added 
              {#if showDateAddedArrow}<span class="table-sort-arrow">▲</span>{/if}
            </th>
            <th id="size" onmouseover={() => (showSizeArrow = true)} onclick={() => sortTable("size")}>size 
              {#if showSizeArrow}<span class="table-sort-arrow">▲</span>{/if}
            </th>
            <th id="file-url" onmouseover={() => (showUrlArrow = true)} onclick={() => sortTable("text")} style="border-right: none;">url 
              {#if showUrlArrow}<span class="table-sort-arrow">▲</span>{/if}
            </th>
          </tr>
            {#each fileMap as curFile, i}
                <tr class={i % 2 === 0? "table-element-odd" : "table-element-odd"}>
                    <td class={i % 2 === 0? "table-element-odd" : "table-element-odd"}>
                        <span class="filename">{curFile.filename}</span>
                    </td>
                    <td class={i % 2 === 0? "table-element-odd" : "table-element-odd"}>{curFile.dateAdded}</td>
                    <td class={i % 2 === 0? "table-element-odd" : "table-element-odd"}>{curFile.fileSize}</td>
                    <td style="border-right: none; display: flex; justify-content: space-between" class={i % 2 === 0? "table-element-odd" : "table-element-odd"}>
                        <a href="https://{currentDomain}/${curFile.serverPath}">{curFile.serverPath}</a>
                        <div>
                            <i class="fa fa-copy" onmousedown={() => (navigator.clipboard.writeText("https://{currentDomain}/{curFile.serverPath}"))} style="margin-right: 2px; cursor: pointer;"></i>
                            <i class="fa fa-trash-o" onmousedown={() => (deleteCurrentFile(i))} style="margin-right: 2px; cursor: pointer;"></i>
                        </div>
                    </td>
                </tr>
            {/each}
            </tbody>
        </table>
      </section>
    </div>
    <div id="alert-area">
        <div class="copy-alert">
            <h3>copied <a href={curCopiedLink}>{curCopiedLink}</a> to clipboard! &lt;w&gt;</h3>
        </div>
    </div>
</div>

<style>
:root {
    --focus: rgb(193, 115, 66);
    --unfocus: rgb(193, 174, 66);
    --text: rgb(180 181 191);
    --link: rgb(100, 101, 112);
    --background: rgb(40 40 40);
}

#body {
    background-color: var(--background);
    color: var(--text);
    font-family: "Zen Kaku Gothic New", sans-serif;
    font-size: 16px;
    margin: 0;
    text-align: center;
}

a {
    color: var(--link);
}

button {
    cursor: pointer;
    background-color: var(--focus);
    color: white;
    border: none;
    padding: 8px 18px;
    text-decoration: none;
}

a {
    color: white;
    text-decoration: none;
}

input[type=text], input[type=username], input[type=password] {
    border-color: var(--unfocus);
    background-color: transparent;
    color: white;
} input[type=text]:focus, input[type=username]:focus, input[type=password]:focus {
    outline: none;
}

#background {
    height: 100vh;
    width: 100vw;
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
    background-size: cover;
    background-position: center;
    filter: blur(7.5px) brightness(0.15);
}

.screen-overlay {
    display: flex;
    position: absolute;
    height: 100vh;
    width: 100vw;
    top: 0;
    left: 0;
    z-index: 1;
    backdrop-filter: blur(7.5px) brightness(0.5);
    justify-content: center;
    align-items: center; /* defaults to assuming it's flex~ */
}

.white-click-text {
    color: white;
    cursor: pointer;
}

#log-in-area {
    display: grid;
}

#login-button {
    margin-top: 20px;
}

#page-url {
    color: white;
}

#logout-area {
    display: flex;
    position: absolute;
    top: 10px;
    right: 15px;
    align-items: center;
}

#logout {
    color: white;
    margin-right: 10px;
    cursor: pointer;
}

#user-pfp {
    width: 40px;
    border-radius: 50%;
    cursor: pointer;
}

#below-header {
    position: relative;
    height: calc(100vh - 56px - 8px); /* for whatever reason, 8px + header seems to do the trick~ */
}

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

#left-content {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50%;
    height: 100%;
}

#flanstore-info {
    margin-bottom: 56px;
}

#file-display {
    position: absolute;
    overflow-y: scroll;
    scrollbar-width: none;
    top: 5px;
    right: 0px;
    border: 2px solid var(--focus);
    height: calc(100vh - 56px - 20px); /* gives it a bit of margin at the bottom, the 56px is the header */
    width: 50%;
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

.file-table {
    table-layout: fixed; /* UNLUCKY but what i have to do for the sexy ellipses */
    border-collapse: collapse;
    border-spacing: 0;
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
    display: none;
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
        height: auto;
    }

    #flanstore-info {
        margin-bottom: 40px;
    }

    #left-content {
        width: 100%;
        height: auto;
    }

    #logout-area {
        position: relative;
        top: 0;
        right: 0;
        float: right;
    }

    #file-display {
        position: relative;
        width: 100%;
        height: 100%;
    }

    #header-text {
        display: none;
    }
}
</style>