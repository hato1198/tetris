// ===== GitHub Pages Redirector v1.0 =====
// このスクリプトをリダイレクトさせたいHTMLの<head>タグの先頭で読み込む。
// 例: <script src="assets/js/redirect.js"></script>

(function() {
  // --- 設定項目 ---
  // 環境に合わせて、以下の3つの項目を書き換える。

  /**
   * 1. GitHub Pagesのホスト名
   * @type {string}
   * 例: 'your-username.github.io'
   */
  const GITHUB_HOST = 'hato1198.github.io';

  /**
   * 2. メインで表示させたいドメイン
   * @type {string}
   * 例: 'my-awesome-app.vercel.app'
   */
  const TARGET_HOST = 'neontetris.vercel.app';

  /**
   * 3. GitHub Pagesのリポジトリ名（パスに含まれる場合）
   * @type {string}
   * プロジェクトURLが 'username.github.io/repository-name' の場合はそのリポジトリ名を入力します。
   * カスタムドメインやユーザサイト（username.github.io）でルートに公開している場合は空文字列 '' にしてください。
   * 例: 'mygame'
   */
  const REPOSITORY_NAME = 'tetris';

  // --- 設定はここまで ---


  // 現在のホスト名がGitHub Pagesのものと一致するか判定
  if (window.location.hostname === GITHUB_HOST) {
    const countdownSeconds = 10; // リダイレクトまでの秒数

    // 新しいURLを構築
    // パスからリポジトリ名を削除（必要な場合）
    const path = REPOSITORY_NAME ? window.location.pathname.replace(`/${REPOSITORY_NAME}`, '') : window.location.pathname;
    const targetUrl = `https://${TARGET_HOST}${path}${window.location.search}${window.location.hash}`;

    // ページ全体をリダイレクトメッセージで上書き
    document.write(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ページ移動のお知らせ</title>
        <link rel="canonical" href="${targetUrl}">
        <style>
          :root {
            --bg-color: #f5f5f5;
            --text-color: #333;
            --link-color: #007bff;
            --border-color: #ddd;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg-color: #121212;
              --text-color: #eee;
              --link-color: #3298fb;
              --border-color: #444;
            }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            padding: 1.5em;
            text-align: center;
            box-sizing: border-box;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            padding: 2em;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background-color: var(--bg-color);
          }
          h1 {
            font-size: 1.5rem;
            margin-top: 0;
          }
          p {
            margin-bottom: 1.5em;
          }
          #countdown {
            font-weight: bold;
          }
          .link-button {
            display: inline-block;
            padding: 0.75em 1.5em;
            background-color: var(--link-color);
            color: #fff;
            text-decoration: none;
            border-radius: 5px;
            transition: opacity 0.2s ease;
          }
          .link-button:hover {
            opacity: 0.85;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>ページ移転のお知らせ</h1>
          <p>このページは新しいアドレスに移動しました。<br><span id="countdown">${countdownSeconds}</span>秒後に自動的に移動します。</p>
          <a class="link-button" href="${targetUrl}">すぐに移動する</a>
        </div>
        <script>
          (function() {
            let count = ${countdownSeconds};
            const countdownEl = document.getElementById('countdown');
            const interval = setInterval(() => {
              count--;
              if (countdownEl) {
                countdownEl.textContent = Math.max(0, count);
              }
              if (count <= 0) {
                clearInterval(interval);
              }
            }, 1000);
            setTimeout(() => {
              window.location.replace('${targetUrl}');
            }, ${countdownSeconds * 1000});
          })();
        <\/script>
      </body>
      </html>
    `);
    // 元のHTMLの読み込みを停止
    if (window.stop) {
      window.stop();
    } else {
      document.execCommand('Stop');
    }
  }
})();