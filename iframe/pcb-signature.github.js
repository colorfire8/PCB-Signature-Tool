/** GitHub 仓库解析与协议获取 */
(function () {
	function parseGithubRepo(input) {
		try {
			const url = new URL(input);
			if (!url.hostname.includes('github.com')) return null;
			const parts = url.pathname.split('/').filter(Boolean);
			if (parts.length < 2) return null;
			return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
		} catch {
			return null;
		}
	}

	function toRepoShortText(repoUrl) {
		const parsed = parseGithubRepo(repoUrl);
		if (!parsed) return repoUrl;
		return `${parsed.owner}/${parsed.repo}`;
	}

	async function fetchGithubLicense(repoUrl) {
		const parsed = parseGithubRepo(repoUrl);
		if (!parsed) return null;
		const { owner, repo } = parsed;
		try {
			const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
			if (!resp.ok) return null;
			const data = await resp.json();
			if (data && data.license && (data.license.spdx_id || data.license.name)) {
				return data.license.spdx_id === 'NOASSERTION' ? data.license.name : data.license.spdx_id;
			}
			return null;
		} catch {
			return null;
		}
	}

	window.PcbSignatureGitHub = {
		parseGithubRepo,
		toRepoShortText,
		fetchGithubLicense,
	};
})();

