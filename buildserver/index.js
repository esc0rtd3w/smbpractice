const express = require('express')
const fs = require('fs')
const { execFile } = require('child_process');
const path = require('path')

const app = express()
const port = 8888

app.set('view engine', 'pug')

app.use(express.static('public'))

function write_splits(res, worlds) {
	var world_rules = ''
	var pup_bytes = '.db '

	for(let i = 0; i < worlds.length; ++i)
	{
		let levels = worlds[i]
		if(!levels || 4 != levels.length)
		{
			res.status(500).send('Invalid number of levels for world ' + (i + 1))
			return
		}

		world_rules += '.dw '
		let enc_lives = 0

		for(let x = 0; x < levels.length; ++x)
		{
			let v = levels[x].split(':')
			if(2 != v.length)
			{
				res.status(500).send('Invalid level value')
				return
			}

			let rules = Number(v[0])
			let pups = Number(v[1])

			if(isNaN(rules) || isNaN(pups))
			{
				res.status(500).send('Not an integer')
				return
			}

			if(rules > 9999 || pups > 2)
			{
				res.status(500).send('Too high rule, or too many pups')
				return
			}

			enc_lives = enc_lives | (pups << (x * 2))

			world_rules += '$' + rules

			if((x + 1) != levels.length)
			{
				world_rules += ', '
			}
		}
		
		pup_bytes += '$' + enc_lives.toString(16)
		if((i + 1) != worlds.length)
		{
			pup_bytes += ', '
		}

		world_rules += '\n'
	}

	// console.log(pup_bytes)
	// console.log(world_rules)

	fs.readFile('../smb.asm', 'utf8', (err, data) => {
		if(err) {
			console.log('Reading:' + err)
			res.status(500).send('Something broke horribly')
			return
		}

		data = data.replace(/;<BUILD_PATCH_LEVELS>[\s\S]+;<\/BUILD_PATCH_LEVELS>/m, world_rules)
		data = data.replace(/;<BUILD_PATCH_PUPS>[\s\S]+;<\/BUILD_PATCH_PUPS>/m, pup_bytes)

		var file_base = 'builds/smb-' + (new Date().getTime())

		fs.writeFile('../' + file_base + '.asm', data, (err) => {
			if(err) {
				console.log('Writing: ' + err)
				res.status(500).send('Something broke horribly')
				return
			}

			execFile('bash', [ 'build.sh', file_base + '.asm' ], { cwd: '..' }, (err, stdout, stderr) => {
				if(err) {
					console.log('bash: ', err)
					res.status(500).send('Build exploded somehow <.<')
					return
				}
				
				res.setHeader('Content-Disposition', 'attachment; filename=smbpractice.nes');
				res.setHeader('Content-Transfer-Encoding', 'binary');
				res.setHeader('Content-Type', 'application/octet-stream');

				res.sendFile(path.join(__dirname, '..', file_base + '.nes'))
			})
		})
	})
}

app.get('/', function(req, res) {
	//
	// To get an idea if anyone is using it...
	//
	const ip = req.connection.remoteAddress || '<no idea>'
	console.log('Access root: ' + ip)

	res.render('index')
})

app.get('/practice', function(req, res) {
	//
	// To get an idea if anyone is using it...
	//
	const ip = req.connection.remoteAddress || '<no idea>'
	console.log('Access /practice: ' + ip)

	res.render('practice')
})

app.get('/build', function(req, res) {
	console.log('Got build request!')
	write_splits(res,
		[
			req.query.w1,
			req.query.w2,
			req.query.w3,
			req.query.w4,
			req.query.w5,
			req.query.w6,
			req.query.w7,
			req.query.w8
		]
	)
})

app.listen(port, function() {
	console.log('SMB Practice ROM - Buildserver on port: ' + port)
})



