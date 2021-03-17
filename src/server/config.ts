// Native
import fs from 'fs-extra'
import path from 'path'

// Packages
import clone from 'clone'
import convict from 'convict'

const serverCfgFilePath = path.join(process.cwd() || '.', '/config.json')
const cfgDirectoryPath = path.parse(serverCfgFilePath).dir

// Make 'config' folder if it doesn't exist
if (!fs.existsSync(cfgDirectoryPath)) {
    fs.mkdirpSync(cfgDirectoryPath)
}

export const config = loadConfig(serverCfgFilePath)

function loadConfig (serverCfgPath: string) {
    const convictSchema = {
        host: {
            doc: 'The IP address or hostname that theiacg should bind to.',
            format: String,
            default: '0.0.0.0'
        },
        port: {
            doc: 'The port that theiacg should listen on.',
            format: 'port',
            default: 5051
        },
        baseURL: {
            doc: 'The URL of this instance. Used for things like cookies. Defaults to HOST:PORT. ' +
        'If you use a reverse proxy, you\'ll likely need to set this value.',
            format: String,
            default: ''
        }
    }

    const convictConfig = convict(convictSchema)

    // Load server config if it exists, and merge it
    const serverCfgExists = fs.existsSync(serverCfgPath)
    if (serverCfgExists) {
        convictConfig.loadFile(serverCfgPath)
    } else {
        console.info('[sweeper-chess] No config found, using defaults.')
    }

    convictConfig.validate()
    const config = convictConfig.getProperties()

    config.baseURL = config.baseURL || `${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`

    return clone(config)
}

