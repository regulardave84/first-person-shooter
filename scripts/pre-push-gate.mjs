import { execFileSync } from 'node:child_process';

function runCommand(command, args) {
	execFileSync(command, args, { stdio: 'inherit' });
}

function getCurrentBranch() {
	return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
		encoding: 'utf8',
	}).trim();
}

function main() {
	const branch = getCurrentBranch();
	const command = branch === 'main' ? 'quality:pr' : 'validate:fast';

	console.log(`[pre-push] branch=${branch}`);
	console.log(`[pre-push] running npm run ${command}`);

	runCommand('npm', ['run', command]);
}

main();
