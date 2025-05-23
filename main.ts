To modify the provided Node.js code for Deno Deploy, we need to address several key differences between the Node.js and Deno environments. Deno is designed to be a secure runtime, so file system access, network requests, and environment variables are handled differently.
Here's a breakdown of the necessary changes and the modified Deno code:
Key Differences & Modifications for Deno Deploy
1. Module Imports
Deno uses ES module imports with URLs. Node.js uses require().
 * Node.js: const express = require("express");
 * Deno: import { serve } from "https://deno.land/std@0.224.0/http/server.ts"; (for HTTP server) and direct URL imports for other libraries.
2. File System Access
Deno's file system access requires explicit permissions (--allow-read, --allow-write) and uses Deno.readTextFile, Deno.writeTextFile, Deno.mkdir, Deno.remove, etc., which return Promises. Synchronous operations like fs.readFileSync are generally avoided in favor of asynchronous ones. Deno Deploy itself has limitations on persistent file system storage.
 * Modification: Given Deno Deploy's ephemeral file system, storing large files like web, bot, npm, php, sub.txt, boot.log, config.json, tunnel.json, and tunnel.yml directly on the server for extended periods is not practical or reliable. The current logic of downloading these binaries and saving configuration files to FILE_PATH (which is ./tmp) won't work persistently across deployments or even within a single instance's lifetime if the instance restarts.
   * For the server configuration (config.json), we'll generate it in-memory.
   * For the external binaries (web, bot, npm, php), Deno Deploy doesn't allow executing arbitrary binaries directly. The logic for downloading and executing web, bot, npm, and php will not work on Deno Deploy. Deno is a JavaScript/TypeScript runtime. To achieve similar functionality, these components would need to be re-implemented in TypeScript/JavaScript or replaced with Deno-native alternatives if they are critical.
   * The boot.log file for cloudflared output and sub.txt/list.txt for node storage also won't persist. The cloudflared output would need to be captured differently (e.g., streaming to logs or in-memory) and sub.txt/list.txt would need a persistent storage solution if uploads are needed (e.g., a database, external API, or a Deno KV store if available).
 * Decision for Deno Deploy: I'll remove the file system operations related to binary downloads and execution (web, bot, npm, php). The core HTTP server and subscription generation logic will be adapted. The cloudflared (bot) and nezha (npm/php) functionalities will need to be re-evaluated for Deno Deploy. For this modification, I'll assume they are external services you manage and just focus on the config.json and subscription generation.
3. Environment Variables
Deno accesses environment variables via Deno.env.get().
 * Node.js: process.env.PORT
 * Deno: Deno.env.get("PORT")
4. Child Processes
Deno has Deno.run for running external commands, but Deno Deploy restricts this for security reasons. exec and execSync will not work.
 * Modification: All child_process related code (exec, execSync, pkill) will be removed as external binary execution is not supported on Deno Deploy. This means cloudflared and nezha cannot be run directly within the Deno Deploy environment using this method.
5. HTTP Server
Deno uses Deno.serve or serve from deno.land/std/http. Express.js is a Node.js framework and cannot be used directly.
 * Modification: Replace Express.js with Deno's native HTTP server.
6. Global Objects
console.log and Buffer are similar but Buffer in Deno is typically replaced by Uint8Array and TextEncoder/TextDecoder.
 * Modification: Use btoa and atob for Base64 encoding/decoding and TextEncoder/TextDecoder for string/Uint8Array conversions.
7. Asynchronous Operations
Many Node.js functions are synchronous, but Deno strongly favors async/await with Promises.
 * Modification: Ensure all file and network operations are asynchronous.
8. os module
The os module for architecture detection is not available. Deno provides Deno.build.arch.
 * Modification: Use Deno.build.arch.
Deno Deploy Ready Code
Given the constraints of Deno Deploy, the focus will be on the HTTP server and the dynamic generation of the VLESS/VMESS/Trojan subscription link. The parts responsible for downloading and running web, bot, npm, php, and managing their local files are removed as they are not compatible with Deno Deploy's execution model.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import * as path from "https://deno.land/std@0.224.0/path/mod.ts";

// Environment variables
const UPLOAD_URL = Deno.env.get('UPLOAD_URL') || '';      // Node or subscription auto-upload address
const PROJECT_URL = Deno.env.get('PROJECT_URL') || '';    // Project URL for subscription upload/keep-alive
const AUTO_ACCESS = Deno.env.get('AUTO_ACCESS') === 'true'; // Auto keep-alive, requires PROJECT_URL
const SUB_PATH = Deno.env.get('SUB_PATH') || 'sub';       // Subscription path
const PORT = parseInt(Deno.env.get('SERVER_PORT') || Deno.env.get('PORT') || '3000'); // HTTP service port
const UUID = Deno.env.get('UUID') || '9afd1229-b893-40c1-84dd-51e7ce204913'; // UUID for configs
const ARGO_DOMAIN = Deno.env.get('ARGO_DOMAIN') || '';          // Fixed tunnel domain, empty for temporary
const ARGO_AUTH = Deno.env.get('ARGO_AUTH') || '';              // Fixed tunnel key (json/token)
const ARGO_PORT = parseInt(Deno.env.get('ARGO_PORT') || '8001'); // Fixed tunnel port
const CFIP = Deno.env.get('CFIP') || 'www.visa.com.sg';         // Node preferred domain/IP
const CFPORT = parseInt(Deno.env.get('CFPORT') || '443');                   // Node preferred port
const NAME = Deno.env.get('NAME') || 'Vls';                     // Node name

// Note: NEZHA_SERVER, NEZHA_PORT, NEZHA_KEY, FILE_PATH, npmPath, phpPath, webPath, botPath, subPath, listPath, bootLogPath, configPath
// and all related file system operations and child process executions (e.g., running `web`, `bot`, `npm`, `php`)
// are removed as they are not compatible with Deno Deploy's security model and ephemeral file system.
// These services (Nezha, Cloudflare Tunnel) are expected to run as external processes or on other platforms.

// Function to generate xr-ay compatible configuration (in-memory)
function generateConfig() {
    const config = {
        log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
        inbounds: [
            { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: UUID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/vless-argo", dest: 3002 }, { path: "/vmess-argo", dest: 3003 }, { path: "/trojan-argo", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
            { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
            { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
            { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
            { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
        ],
        dns: { servers: ["https+local://8.8.8.8/dns-query"] },
        outbounds: [ { protocol: "freedom", tag: "direct" }, {protocol: "blackhole", tag: "block"} ]
    };
    // In Deno Deploy, this config would typically be used by the program itself,
    // not written to a file for an external binary to consume.
    // If you need to access this config from another service, you'd expose it via an endpoint or another mechanism.
    return JSON.stringify(config, null, 2);
}

// Extract domain - simplified for Deno Deploy, assumes ARGO_DOMAIN is always set
// If ARGO_DOMAIN is not set, you'd need an external way to get the temporary Cloudflare Tunnel domain.
// Deno Deploy does not provide access to `boot.log` or a way to run `cloudflared` to generate it.
async function extractDomains() {
    let argoDomain;

    if (ARGO_DOMAIN) {
        argoDomain = ARGO_DOMAIN;
        console.log('Using ARGO_DOMAIN:', argoDomain);
    } else {
        // In a real Deno Deploy scenario, if ARGO_DOMAIN is not set,
        // you would need an external mechanism (e.g., a pre-provisioned tunnel, or a different service)
        // to provide the temporary Cloudflare Tunnel domain.
        // The original logic for reading boot.log and re-running `bot` is not applicable here.
        console.warn('ARGO_DOMAIN is not set. Cannot determine ArgoDomain without external input. Subscription links may be incomplete.');
        // For demonstration, we'll use a placeholder if ARGO_DOMAIN is empty.
        argoDomain = 'your-temporary-argo-domain.trycloudflare.com';
    }

    return await generateLinks(argoDomain);
}

// Generate subscription links
async function generateLinks(argoDomain: string) {
    // In Deno Deploy, `execSync` is not available.
    // To get ISP information, you'd need to use a Deno-native HTTP client to a service
    // like https://speed.cloudflare.com/meta or rely on environment variables.
    // For simplicity, we'll use a placeholder for ISP.
    // Original: `execSync('curl -s https://speed.cloudflare.com/meta | awk -F\\" \'{print $26"-"$18}\' | sed -e \'s/ /_/g\'', { encoding: 'utf-8' });`
    const ISP = "Cloudflare"; // Placeholder for ISP in Deno Deploy

    const VMESS_OBJ = { v: '2', ps: `${NAME}-${ISP}`, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/vmess-argo?ed=2560', tls: 'tls', sni: argoDomain, alpn: '' };
    const subTxt = `
vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=%2Fvless-argo%3Fed%3D2560#${NAME}-${ISP}
  
vmess://${btoa(JSON.stringify(VMESS_OBJ))}
  
trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=%2Ftrojan-argo%3Fed%3D2560#${NAME}-${ISP}
    `;
    return subTxt;
}

// Automatic upload nodes/subscriptions (simplified, no file reading)
async function uploadNodes(subTxt: string) {
    if (UPLOAD_URL && PROJECT_URL) {
        const subscriptionUrl = `${PROJECT_URL}/${SUB_PATH}`;
        const jsonData = {
            subscription: [subscriptionUrl]
        };
        try {
            const response = await fetch(`${UPLOAD_URL}/api/add-subscriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonData)
            });

            if (response.ok) {
                console.log('Subscription uploaded successfully');
            } else {
                console.error(`Failed to upload subscription: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error(`Error uploading subscription: ${error.message}`);
        }
    } else if (UPLOAD_URL) {
        // In Deno Deploy, there's no `listPath` to read nodes from.
        // If nodes need to be uploaded, they must be generated in-memory or fetched from another source.
        console.log('Skipping node upload to UPLOAD_URL as listPath is not available in Deno Deploy context.');
    } else {
        console.log('Skipping upload nodes: UPLOAD_URL not set.');
    }
}

// Automatic visit project URL for keep-alive
async function addVisitTask() {
    if (!AUTO_ACCESS || !PROJECT_URL) {
        console.log("Skipping adding automatic access task");
        return;
    }

    try {
        const response = await fetch('https://oooo.serv00.net/add-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: PROJECT_URL })
        });
        if (response.ok) {
            console.log('Automatic access task added successfully');
        } else {
            console.error(`Failed to add auto access task: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Error adding auto access task: ${error.message}`);
    }
}

// Main server logic
async function handler(req: Request) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
        return new Response("Hello world!", { status: 200 });
    } else if (url.pathname === `/${SUB_PATH}`) {
        const subContent = await extractDomains();
        const encodedContent = btoa(subContent); // Base64 encode
        return new Response(encodedContent, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    return new Response("Not Found", { status: 404 });
}

// Start the server
// The `serve` function automatically binds to the host and port Deno Deploy provides.
// For local testing, you can use `Deno.serve({ port: PORT }, handler);`
// Deno Deploy sets the port automatically, so we just use `Deno.serve(handler);`
// Deno Deploy does not use `app.listen`, instead `Deno.serve` is the entry point.

console.log(`HTTP server is starting...`);

// Initial setup tasks (non-blocking for server start)
const startServerTasks = async () => {
    // In Deno Deploy, deleteNodes and cleanupOldFiles are not applicable
    // due to the ephemeral file system and no explicit node/subscription storage on deploy.
    // The previous `downloadFilesAndRun` is also not applicable.

    const subTxt = await extractDomains();
    await uploadNodes(subTxt); // Upload generated subscription content
    await addVisitTask();
    console.log('App is running');
    console.log('Thank you for using this script, enjoy!');
};

// Run initial tasks once the server starts.
// For Deno Deploy, the `serve` function is the main entry point and runs indefinitely.
// The initial tasks should be called directly or as part of the startup logic.
startServerTasks();

// The server starts when `Deno.serve` is called.
Deno.serve(handler);

How to Deploy to Deno Deploy
 * Save the Code: Save the modified code as a .ts file (e.g., main.ts).
 * Set Environment Variables: Go to your Deno Deploy project settings and add the necessary environment variables:
   * UPLOAD_URL
   * PROJECT_URL
   * AUTO_ACCESS (set to true or false)
   * SUB_PATH
   * UUID
   * ARGO_DOMAIN (highly recommended to set this for fixed tunnels)
   * ARGO_AUTH (if using fixed tunnels)
   * ARGO_PORT
   * CFIP
   * CFPORT
   * NAME
 * Deploy: Connect your Deno Deploy project to a Git repository (e.g., GitHub). When you push changes to your main.ts file, Deno Deploy will automatically detect and deploy it.
 * Permissions: Deno Deploy automatically handles many permissions, but for network requests (like Workspace to UPLOAD_URL or oooo.serv00.net), you typically don't need explicit --allow-net in the deploy.json (if you were using one) because it's the default.
Important Considerations for Deno Deploy
 * No Binary Execution: Deno Deploy is a serverless JavaScript/TypeScript runtime. It cannot download and execute arbitrary binaries like web, bot (cloudflared), npm (nezha agent), or php (nezha v1 client). If you need these functionalities, they must be run on a different platform (e.g., a traditional VPS, a Docker container, etc.) and interact with your Deno Deploy service via network calls.
 * Ephemeral File System: Any files written during execution (like config.json, boot.log, sub.txt) are temporary and will be lost when the Deno Deploy instance scales down, restarts, or is redeployed. This makes persistent storage of nodes or logs directly on the instance impossible. If you need to store nodes, consider using a Deno KV (if available and suitable for your use case), an external database, or another persistent storage solution.
 * ARGO_DOMAIN is Crucial: Since cloudflared cannot run on Deno Deploy to generate a temporary tunnel domain, it's essential to use a fixed Cloudflare Tunnel and set the ARGO_DOMAIN environment variable. This domain will be used to generate the subscription links.
 * ISP Information: Obtaining the ISP information via curl and awk is not possible. A placeholder was used. If this data is critical, you'll need an alternative method (e.g., using a third-party API in Deno's Workspace).
 * deleteNodes and cleanupOldFiles: These functions were dependent on local file system operations, which are not suitable for Deno Deploy. Their logic was removed.
This modified code provides a functional HTTP server for Deno Deploy that serves the subscription links, but it offloads the responsibilities of running cloudflared and nezha to external services, which is the appropriate architectural pattern for Deno Deploy.
