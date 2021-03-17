// Native
import path from 'path'
import fs from 'fs'

// Packages
import express from 'express'

// Ours
import { config } from '../config.js'

const isDev = process.env.NODE_ENV === 'development'

export default function () {

    let assetManifest: Object

    if (!isDev) {
        const assetManifestPath = path.join(process.env.CG_ROOT || '.', 'build/client/manifest.json')

        const assetManifestExists = fs.existsSync(assetManifestPath)
        if (assetManifestExists) {  
            const assetManifestFile = fs.readFileSync(assetManifestPath)

            assetManifest = JSON.parse(assetManifestFile.toString())
        } else {
            console.error('In production but no asset manifest.json file found in /build/client')
        }
    }

    const app = express()

    // Static routes
    app.use('/assets', express.static(path.join(process.env.CG_ROOT || '.', 'build/client/assets')))

    app.use(express.static(path.join(process.env.CG_ROOT || '.', 'static')))

    app.set('views', path.join(process.cwd(), 'views'))
    app.set('view engine', 'ejs')

    app.get('/', async (req, res) => {

        const renderContext = {
            isDev
        }

        return res.render('index', renderContext)
    })

    return app
}
