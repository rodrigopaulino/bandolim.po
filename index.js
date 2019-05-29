#!/usr/bin/env node

const request = require("request");
const fs = require("fs");
const shell = require("shelljs");
const del = require("del");
const vorpal = require("vorpal")();
const colors = require("colors");
const inquirer = require("inquirer");
const JiraApi = require("jira").JiraApi;
const Promise = require("promise");
const pathExists = require('path-exists');
const bcrypt = require('bcrypt');

const saltRounds = 12;

const patchingToolPath = "./patching-tool";
const patchesPath = `${patchingToolPath}/patches`;
const prefixFPURL = "http://nikita/private/ee/fix-packs";
const prefixURL6210 = `${prefixFPURL}/6.2.10`;
const prefixURL7010 = `${prefixFPURL}/7.0.10`;
const prefixURL7110 = `${prefixFPURL}/7.1.10`;
const prefixURL7210 = `${prefixFPURL}/7.2.10`;

const questions = [
	{
		type: "input",
		message: colors.magenta("Please enter your Liferay.com username:"),
		name: "liferayUsername",
		required: true
	},
	{
		type: "password",
		message: colors.magenta("Please enter your Liferay.com password:"),
		name: "liferayPassword",
		required: true
	},
	{
		type: "input",
		message: colors.magenta("Please enter your JIRA username:"),
		name: "jiraUsername",
		required: true
	},
	{
		type: "password",
		message: colors.magenta("Please enter your JIRA password:"),
		name: "jiraPassword",
		required: true
	}
];

const result = {
	total: null,
	issues: []
};
const options = {
	startAt: 0,
	maxResults: 5000,
	fields: [
		"id",
		"key"
	]
};

var tuple = "";
var filter = "";

function downloadAndInstall(url, destFile) {
	var statusCode;
	request
		.get(url)
		.on("response", function(response) {
			statusCode = response.statusCode;
			if (statusCode == 200) {
				log("Downloading patch...");
			}
			else if (statusCode == 404) {
				log("Patch not found!");
			}
			else {
				log(`Resquest status: ${response.statusCode}`);
			}
		})
		.pipe(
			fs.createWriteStream(destFile)
		).on("finish", function () {
			if (statusCode == 200) {
				del([`${patchesPath}/*`, `!${destFile}`])
				.then(paths => {
					shell.exec(
						`${patchingToolPath}/patching-tool.sh install -force`);
				});
			}
			else {
				del(destFile);
			}
		});
}

function log(message) {
	vorpal.activeCommand.log(message);
}

function getIssues(
	newer, older, version, total, component, username, password) {

	var label = "";
	var tuple = "";
	var comma = "";

	if (version == "7.0" || version == "7.1" || version == "7.2") {
		filter = "AND ((project = LPS AND level = null) OR project = LPE)";
	} else {
		filter = "AND project = LPE";
	}

	filter += (component) ? ` AND component = ${component}` : "";

	while (newer > older) {
		if (version == "7.2") {
			label = `liferay-fixpack-dxp-${newer}-7210`;
		}
		else if (version == "7.1") {
			label = `liferay-fixpack-dxp-${newer}-7110`;
		}
		else if (version == "7.0") {
			label = `liferay-fixpack-de-${newer}-7010`;
		}
		else {
			label = `liferay-fixpack-portal-${newer}-6210`;
		}

		tuple = tuple + comma + label;
		comma = ",";
		newer--;
	}

	var jira = new JiraApi(
		"https", "issues.liferay.com", null, username, password, 2);

	return new Promise((resolve, reject) => {
			jira.searchJira(
				`labels IN (${tuple}) ${filter} ORDER BY key ASC`,
				options, function callback(error, body) {
					if (error) {
						return reject(error);
					}

					if (!result.total) {
						result.total = body.total;
					}

					body.issues.forEach((item, index, arr) => {
						result.issues.push(item);
					});

					if (result.issues.length < result.total) {
						options.startAt += body.issues.length;

						return jira.searchJira(
							`labels IN (${tuple}) ${filter} ORDER BY key ASC`,
							options, callback);
					} else {
						return resolve(result);
					}
				});
		});
}

vorpal
	.command("license")
	.action(
		(args, callback) => {

		}
	);

vorpal
	.command("setup")
	.action(
		(args, callback) => {
			pathExists('./credentials.properties')
				.then(exists => {
					if (exists) {
						return inquirer.prompt([{
							type: "input",
							message: colors.magenta("You already have your credentials setup. Are you trying to reconfigure them (y/n):"),
							name: "answer",
							required: true
						}]).then(function (answers) {
							if (answers.answer === 'n' || answers.answer === 'N') {
								return false;
							}
							else {
								return true;
							}
						});
					}
					else {
						return true;
					}
				})
				.then(finalAnswer => {
					if (finalAnswer) {
						inquirer.prompt(questions)
							.then(function (answers) {
								bcrypt.hash(answers.liferayPassword, saltRounds)
									.then(function(hash) {
										return obj = {
											liferayUsername: answers.liferayUsername,
											liferayPassword: hash
										}
									})
									.then(obj => {
										return bcrypt.hash(answers.jiraPassword, saltRounds).then(hash => {
											obj.jiraUsername = answers.jiraUsername;
											obj.jiraPassword = hash;

											return obj;
										});
									})
									.then(obj => {
										fs.writeFileSync('./credentials.properties', JSON.stringify(obj));
									});
							});
					}
				});
			}
	);

vorpal
	.command("latest")
	.action(
		(args, callback) => {
			var fileName;
			var url;
			var fixpackDirURL;
			var latestURL;
			var destFile;

			pathExists('./patching-tool').then(exists => {
				if (exists) {
					var text = fs.readFileSync('readme.html','utf8');

					if (text.includes('6\x2e2')) {
						fixpackDirURL = `${prefixURL6210}/portal`

						request(`${fixpackDirURL}/LATEST.txt`,
							function (error, response, body) {
								fileName = `liferay-fix-pack-portal-${body}-6210.zip`;
								url = `${fixpackDirURL}/${fileName}`;
								destFile = `${patchesPath}/${fileName}`;

								downloadAndInstall(url, destFile);
							}
						);
					}
					else if (text.includes('7\x2e0')) {
						fixpackDirURL = `${prefixURL7010}/de`

						request(`${fixpackDirURL}/LATEST.txt`,
							function (error, response, body) {
								fileName = `liferay-fix-pack-de-${body}-7010.zip`;
								url = `${fixpackDirURL}/${fileName}`;
								destFile = `${patchesPath}/${fileName}`;

								downloadAndInstall(url, destFile);
							}
						);
					}
					else if (text.includes('7\x2e1')) {
						fixpackDirURL = `${prefixURL7110}/dxp`

						request(`${fixpackDirURL}/LATEST.txt`,
							function (error, response, body) {
								fileName = `liferay-fix-pack-dxp-${body}-7110.zip`;
								url = `${fixpackDirURL}/${fileName}`;
								destFile = `${patchesPath}/${fileName}`;

								downloadAndInstall(url, destFile);
							}
						);
					}
					else if (text.includes('7\x2e2')) {
						fixpackDirURL = `${prefixURL7210}/dxp`

						request(`${fixpackDirURL}/LATEST.txt`,
							function (error, response, body) {
								fileName = `liferay-fix-pack-dxp-${body}-7210.zip`;
								url = `${fixpackDirURL}/${fileName}`;
								destFile = `${patchesPath}/${fileName}`;

								downloadAndInstall(url, destFile);
							}
						);
					}
					else {
						log("Liferay version not identified.");
					}
				}
				else {
					log("No Patching Tool was detected.")
				}
			});
		}
	);

vorpal
	.command("fixpack <level>")
	.action(
		(args, callback) => {
			var fileName;
			var url;

			pathExists('./patching-tool').then(exists => {
				if (exists) {
					var text = fs.readFileSync('readme.html','utf8');

					if (text.includes('6\x2e2')) {
						fileName = `liferay-fix-pack-portal-${args.level}-6210.zip`;
						url = `${prefixURL6210}/portal/${fileName}`;

						var destFile = `${patchesPath}/${fileName}`;

						downloadAndInstall(url, destFile);
					}
					else if (text.includes('7\x2e0')) {
						fileName = `liferay-fix-pack-de-${args.level}-7010.zip`;
						url = `${prefixURL7010}/de/${fileName}`;

						var destFile = `${patchesPath}/${fileName}`;

						downloadAndInstall(url, destFile);
					}
					else if (text.includes('7\x2e1')) {
						fileName = `liferay-fix-pack-dxp-${args.level}-7110.zip`;
						url = `${prefixURL7110}/dxp/${fileName}`;

						var destFile = `${patchesPath}/${fileName}`;

						downloadAndInstall(url, destFile);
					}
					else if (text.includes('7\x2e2')) {
						fileName = `liferay-fix-pack-dxp-${args.level}-7210.zip`;
						url = `${prefixURL7210}/dxp/${fileName}`;

						var destFile = `${patchesPath}/${fileName}`;

						downloadAndInstall(url, destFile);
					}
					else {
						log("Liferay version not identified.");
					}
				}
				else {
					log("No Patching Tool was detected.");
				}
			});
		}
	);

vorpal
	.command("hotfix <level>")
	.action(
		(args, callback) => {
			var fileName;
			var url;

			pathExists('./patching-tool').then(exists => {
				if (exists) {
					var text = fs.readFileSync('readme.html','utf8');

					if (text.includes('6\x2e2')) {
						fileName = `liferay-hotfix-${args.level}-6210.zip`;
						url = `${prefixURL6210}/hotfix/${fileName}`;

						var destFile = `${patchesPath}/${fileName}`;

						downloadAndInstall(url, destFile);
					}
					else if (text.includes('7\x2e0')) {
						fileName = `liferay-hotfix-${args.level}-7010.zip`;
						url = `${prefixURL7010}/hotfix/${fileName}`;

						var destFile = `${patchesPath}/${fileName}`;

						downloadAndInstall(url, destFile);
					}
					else if (text.includes('7\x2e1')) {
						fileName = `liferay-hotfix-${args.level}-7110.zip`;
						url = `${prefixURL7110}/hotfix/${fileName}`;

						var destFile = `${patchesPath}/${fileName}`;

						downloadAndInstall(url, destFile);
					}
					else if (text.includes('7\x2e2')) {
						fileName = `liferay-hotfix-${args.level}-7210.zip`;
						url = `${prefixURL7210}/hotfix/${fileName}`;

						var destFile = `${patchesPath}/${fileName}`;

						downloadAndInstall(url, destFile);
					}
					else {
						log("Liferay version not identified.");
					}
				}
				else {
					log("No Patching Tool was detected.");
				}
			});
		}
	);

vorpal
	.command("diff <fixpack1> <fixpack2> <version>")
	.option("-t, --total", "Number of tickets between two patch levels.")
	.option("-c, --component <name>", "Filter by Component.")
	// .option("-g, --group', 'Group the result by Components.")
	.action(
		(args, callback) => {
			var newer;
			var older;

			if (args.fixpack1 > args.fixpack2) {
				newer = args.fixpack1;
				older = args.fixpack2;
			} else if (args.fixpack1 < args.fixpack2) {
				newer = args.fixpack2;
				older = args.fixpack1;
			} else {
				log("The fixpacks passed are the same.");
				return;
			}

			if (args.version != "7.2" && args.version != "7.1" && args.version != "7.0" && args.version != "6.2") {
				log(
					"Not a valid Liferay Portal version nor supported by Bandolim.po");
				return;
			}

			inquirer.prompt(questionsJiraAuth).then(function (answers) {
				getIssues(
					newer, older, args.version, args.options.total,
					args.options.component, answers.username, answers.password)
					.then(body => {
						if (args.options.total) {
							log(`Number of tickets: ${body.total}`);
						} else {
							var tickets = "";
							var comma = "";

							body.issues.forEach((item, index, arr) => {
								tickets = tickets + comma + item.key;
								comma = ", ";
							});

							log(tickets);
						}
					})
					.catch(error => {
						log(error);
					});
			});
		}
	);

vorpal.parse(process.argv);
