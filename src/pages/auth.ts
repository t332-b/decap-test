import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  
  // エラーがある場合は処理を停止
  if (error) {
    console.error('GitHub OAuth error:', error);
    return new Response(`GitHub OAuth error: ${error}`, { status: 400 });
  }
  
  if (!code) {
    // 認証コードがない場合は、GitHubの認証ページにリダイレクト
    const clientId = import.meta.env.GITHUB_CLIENT_ID;
    
    // リダイレクトURLを明示的に指定
    const redirectUri = 'http://localhost:4321/auth';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;
    
    console.log('Redirecting to GitHub OAuth:', githubAuthUrl);
    return redirect(githubAuthUrl);
  }

  try {
    // アクセストークンを取得
    const clientId = import.meta.env.GITHUB_CLIENT_ID;
    const clientSecret = import.meta.env.GITHUB_CLIENT_SECRET;
    
    console.log('Getting access token with code:', code.substring(0, 10) + '...');
    
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
        redirect_uri: 'http://localhost:4321/auth'
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response status:', tokenResponse.status);
    
    if (tokenData.access_token) {
      console.log('Successfully got access token');
      
      // アクセストークンをクッキーに保存
      cookies.set('github_token', tokenData.access_token, {
        path: '/',
        httpOnly: true,
        secure: false, // 開発環境ではfalse
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7日間
      });

      // 認証状態をクッキーに保存
      cookies.set('github_authenticated', 'true', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });

      // 管理画面にリダイレクト
      return redirect('/admin');
    } else {
      console.error('Token response error:', tokenData);
      
      // 認証コードが既に使用済みの場合の処理
      if (tokenData.error === 'bad_verification_code') {
        return new Response('認証コードが無効です。再度認証を行ってください。', { 
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      
      throw new Error(`Failed to get access token: ${tokenData.error_description || tokenData.error}`);
    }
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`認証エラーが発生しました: ${errorMessage}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};
