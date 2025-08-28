import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  
  if (!code) {
    // 認証コードがない場合は、GitHubの認証ページにリダイレクト
    const clientId = import.meta.env.GITHUB_CLIENT_ID;
    const redirectUri = 'http://localhost:4321/auth';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo`;
    
    return redirect(githubAuthUrl);
  }

  try {
    // アクセストークンを取得
    const clientId = import.meta.env.GITHUB_CLIENT_ID;
    const clientSecret = import.meta.env.GITHUB_CLIENT_SECRET;
    
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.access_token) {
      // アクセストークンをクッキーに保存
      cookies.set('github_token', tokenData.access_token, {
        path: '/',
        httpOnly: true,
        secure: false, // 開発環境ではfalse
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7日間
      });

      // 管理画面にリダイレクト
      return redirect('/admin');
    } else {
      throw new Error('Failed to get access token');
    }
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return new Response('Authentication failed', { status: 500 });
  }
};
