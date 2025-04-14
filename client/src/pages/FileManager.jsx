import React from 'react'
import { FolderClosed, File } from "lucide-react"

const fileTree = [
    { name: "server.jar", fileType: "file", extension: "jar" },
    { name: "plugins", fileType: "folder" }
];

export const FileManager = () => {
    return (
        <div className="p-4 border rounded shadow">
            <h2 className="text-xl font-bold mb-4">File Manager</h2>
            <ul className="space-y-2">
                {fileTree.map(file => (
                    <li key={file.name} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded">
                        {file.fileType === "folder" ? 
                            <FolderClosed className="text-blue-500" size={18} /> : 
                            <File className="text-gray-500" size={18} />
                        }
                        <span>{file.name}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default FileManager;