export const initialFileTree = [
  {
    id: 1,
    name: "server.jar",
    fileType: "file",
    extension: "jar",
    size: "16.2 MB",
    modifiedAt: "2025-04-10",
    binary: true,
  },
  {
    id: 2,
    name: "plugins",
    fileType: "folder",
    children: [
      {
        id: 3,
        name: "geyser.jar",
        fileType: "file",
        extension: "jar",
        size: "8.4 MB",
        modifiedAt: "2025-04-12",
        binary: true,
      },
      {
        id: 4,
        name: "config.yml",
        fileType: "file",
        extension: "yml",
        size: "3.2 KB",
        modifiedAt: "2025-04-13",
        content: `# Geyser Configuration File
  
  server:
    address: 0.0.0.0
    port: 19132
    name: "Geyser Server"
    motd: "Geyser Minecraft Server"
    compress-packets: true
    max-players: 100
    
  remote:
    address: 127.0.0.1
    port: 25565
    auth-type: online
    
  # Authentication settings
  auth-type: floodgate`,
      },
      {
        id: 5,
        name: "data.db",
        fileType: "file",
        extension: "db",
        size: "2.7 MB",
        modifiedAt: "2025-04-10",
        binary: true,
      },
    ],
  },
  { id: 6, name: "world", fileType: "folder", children: [] },
  {
    id: 7,
    name: "server.properties",
    fileType: "file",
    extension: "properties",
    size: "1.8 KB",
    modifiedAt: "2025-04-11",
    content: `# Minecraft server properties
  server-port=25565
  gamemode=survival
  difficulty=normal
  max-players=20
  view-distance=10
  resource-pack=
  spawn-protection=16
  online-mode=true
  allow-flight=false
  motd=A Minecraft Server
  enable-rcon=false
  level-seed=
  pvp=true
  generate-structures=true
  max-build-height=256`,
  },
  {
    id: 8,
    name: "logs",
    fileType: "folder",
    children: [
      {
        id: 9,
        name: "latest.log",
        fileType: "file",
        extension: "log",
        size: "356 KB",
        modifiedAt: "2025-04-14",
        content: `[14:25:12] [Server thread/INFO]: Starting minecraft server version 1.20.1
  [14:25:12] [Server thread/INFO]: Loading properties
  [14:25:12] [Server thread/INFO]: Default game type: SURVIVAL
  [14:25:12] [Server thread/INFO]: Generating keypair
  [14:25:13] [Server thread/INFO]: Starting Minecraft server on *:25565
  [14:25:13] [Server thread/INFO]: Preparing level "world"
  [14:25:14] [Server thread/INFO]: Preparing start region for dimension minecraft:overworld
  [14:25:16] [Server thread/INFO]: Done (3.245s)! For help, type "help"`,
      },
    ],
  },
];
