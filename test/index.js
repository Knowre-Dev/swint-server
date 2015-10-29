var assert = require('assert'),
	request = require('request'),
	path = require('path'),
	fs = require('fs'),
	os = require('os'),
	swintServer = require('../lib');

global.swintVar.printLevel = 5;

describe('HTTPS-only server', function() {
	var server;

	before(function(done) {
		fs.mkdirSync(path.join(os.tmpdir(), 'swint-server'));

		server = new swintServer({
			http: {
				mode: 'redirect'
			},
			https: {
				mode: 'enabled'
			},
			middleware: {
				loader: [{
					dir: path.join(__dirname, '../test_case/middleware')
				}],
				pre: [
					'pre-middleware1',
					{
						name: 'pre-middleware2',
						options: {
							string: 'middlewareOptionString'
						}
					}
				],
				post: [
					'post-middleware'
				]
			},
			router: {
				dir: path.join(__dirname, '../test_case/router')
			}
		}, function() {
			done();
		});
	});

	it('Protocol Redirection', function(done) {
		request.get({
			url: 'http://localhost:8080/',
			strictSSL: false,
			followRedirect: false
		}, function(err, resp, body) {
			assert.equal(resp.statusCode, 302);
			assert.equal(body, 'Found. Redirecting to https://localhost:8443//');
			done();
		});
	});

	it('Host Redirection', function(done) {
		request.get({
			url: 'https://127.0.0.1:8443/',
			strictSSL: false,
			followRedirect: false
		}, function(err, resp, body) {
			assert.equal(resp.statusCode, 302);
			assert.equal(body, 'Found. Redirecting to https://localhost:8443//');
			done();
		});
	});

	it('Middleware load', function(done) {
		request.get({
			url: 'https://localhost:8443/test_case',
			strictSSL: false
		}, function(err, resp, body) {
			assert.equal(resp.headers['x-pre-middleware1'], 'middleware1');
			assert.equal(resp.headers['x-pre-middleware2'], 'middlewareOptionString');
			assert.equal(resp.headers['x-pre-middleware3'], 'middleware3');
			assert.equal(resp.headers['x-pre-middleware4'], 'middlewareOptionString');
			assert.equal(
				fs.readFileSync(path.join(os.tmpdir(), 'swint-server/post-middleware.txt'), 'utf-8'),
				'test'
			);
			assert.equal(
				fs.readFileSync(path.join(os.tmpdir(), 'swint-server/post-middleware2.txt'), 'utf-8'),
				'test'
			);
			done();
		});
	});

	it('404 test', function(done) {
		request.get({
			url: 'https://localhost:8443/notFound',
			headers: {
				Accept: 'application/json'
			},
			strictSSL: false
		}, function(err, resp, body) {
			assert.equal(resp.statusCode, 404);
			assert.equal(body, '"Swint - 404 Not found"\r\n');
			done();
		});
	});

	it('500 test', function(done) {
		request.get({
			url: 'https://localhost:8443/error',
			headers: {
				Accept: 'application/json'
			},
			strictSSL: false
		}, function(err, resp, body) {
			assert.equal(resp.statusCode, 500);
			assert.equal(body, '"Swint - 500 Internal server error"\r\n');
			done();
		});
	});

	after(function() {
		fs.unlinkSync(path.join(os.tmpdir(), 'swint-server/post-middleware.txt'));
		fs.unlinkSync(path.join(os.tmpdir(), 'swint-server/post-middleware2.txt'));
		fs.rmdirSync(path.join(os.tmpdir(), 'swint-server'));
	});
});
