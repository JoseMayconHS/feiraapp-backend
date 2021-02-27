<?php
 
require_once('class.phpmailer.php');
 
$mailer = new PHPMailer();
$mailer->IsSMTP();
$mailer->CharSet = 'UTF-8';
$mailer->SMTPDebug = 1;
$mailer->Port = 587; // Utilize obrigatoriamente a porta 587.
// Em 'servidor_de_saida' deve ser alterado por um dos hosts abaixo:
// $mailer->Host = 'smtp.vlconstrutora.com.br'; 
$mailer->Host = 'localhost'; 
// Para cPanel: 'localhost';
// Para Plesk 11 / 11.5: 'smtp.dominio.com.br';

$destinatario = isset($_GET['destinatario']) ? $_GET['destinatario'] : null;

$subject = isset($_GET['titulo']) ? $_GET['titulo'] : null;
$data = isset($_GET['data']) ? $_GET['data'] : null;

$score = isset($_GET['score']) ? $_GET['score'] : null;
$severidade = isset($_GET['severidade']) ? $_GET['severidade'] : null;
$resolucao = isset($_GET['resolucao']) ? $_GET['resolucao'] : null;

$nome = isset($_GET['nome']) ? $_GET['nome'] : null;
$email = isset($_GET['email']) ? $_GET['email'] : null;
$mensagem = isset($_GET['mensagem']) ? $_GET['mensagem'] : null;
$nova_senha = isset($_GET['senha']) ? $_GET['senha'] : null;
$lang = isset($_GET['lang']) ? $_GET['lang'] : 'pt';

$token = isset($_GET['token']) ? $_GET['token'] : null;

$pt = $lang == 'pt';

$android_app_link = 'https://play.google.com/store/apps/details?id=com.mentalpro.qad';
$ios_app_link = 'https://apps.apple.com/us/app/qad-depressão/id1550984727';

if ($subject == 'Fale Conosco' || $subject == 'Contact Us') {
  $body = "
    <div style='max-width:681px;  padding: 6em 0em; margin: 0 auto; background: #ffffff; display: grid;'>

      <img src='http://agenciacapiba.com.br/app/qad/assets/logo.png' style='margin: 0 auto; margin-bottom: 3em;'>

      <br>
      
      <h1 style='color:#1FBFCB; text-align: center; margin: 0 auto 20px auto'>" . ( $pt ? 'Olá Equipe QAD' : 'Hello QAD Team') . "</h1>
      <p style='color:#1FBFCB; text-align: center; margin: 0 auto; font-size: 22px;'>" . ( $pt ? 'Meu nome é' : 'My name is') .  " <span style='color: #444; font-weight: bold;'>$nome</span></p>
      <p style='color:#1FBFCB; text-align: center; margin: 0 auto; font-size: 22px;'>
        E-mail: <a href='mailto:$email' style='color: #444; font-weight: bold; text-decoration: unset;'>$email</a>
      </p>
      
      <br>
      
      <div style='margin: 0 auto; width: 100%; margin-top: 3em'>
        <p style='color:#1FBFCB; font-weight: bold; margin: 0 auto; font-size: 1.2em; text-align:center;'>" . ( $pt ? 'Mensagem' : 'Message') . ": </p>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center; max-width: 300px'>$mensagem</p>  
      </div>
    </div>
    ";

    $destinatario = 'mentalprosoftware@gmail.com';
} else if ($subject == 'Redefinir senha' || $subject == 'Redefine password') {
  $body = "
    <div style='max-width:681px;  padding: 6em 0em; margin: 0 auto; background: #ffffff; display: grid'>
    
      <img src='http://agenciacapiba.com.br/app/qad/assets/logo.png' style='margin: 0 auto; margin-bottom: 3em;'>
      
      <h1 style='color:#1FBFCB; text-align: center; margin: 0 auto'>" . ( $pt ? 'Equipe QAD' : 'QAD Team') . "</h1>
      <h2 style='color:#1FBFCB; text-align: center; margin: 0 auto'>". ( $pt ? 'Sua senha foi redefinida' : 'Your password has been reset' ) ."</h2>
      
      <br>
      
      <div style='margin: 0 auto; width: 100%; margin-top: 3em'>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'>" . ( $pt ? "Olá $nome, esta é sua senha provisória" : "Hello $nome, this is your temporary password") . "</p>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'><strong style='color: #222; text-decoration: none;'>$nova_senha</strong></p>  
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'>". ( $pt ? 'Válida somente uma vez' : 'Valid only once' ) .".</p>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'>". ( $pt ? 'Depois de entrar na sua conta, redefina sua senha' : 'After logging into your account, reset your password' ) .".</p>
      </div>
    </div>
    ";
} else if ($subject == 'Plano PRO adquirido com sucesso!' || $subject == 'PRO plan successfully acquired!') {
  $body = "
    <div style='max-width:681px;  padding: 6em 0em; margin: 0 auto; background: #ffffff; display: grid'>
    
      <img src='http://agenciacapiba.com.br/app/qad/assets/logo.png' style='margin: 0 auto; margin-bottom: 3em;'>
      
      <h1 style='color:#1FBFCB; text-align: center; margin: 0 auto'>" . ( $pt ? 'Equipe QAD' : 'QAD Team') . "</h1>
      <h2 style='color:#1FBFCB; text-align: center; margin: 0 auto'>". ( $pt ? 'PARABÉNS' : 'CONGRATULATIONS' ) ."</h2>
      
      <br>
      
      <div style='margin: 0 auto; width: 100%; margin-top: 3em'>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'>" . ( $pt ? "Olá $nome, sua conta agora é <strong style='color: #222; text-decoration: none;'>PRO</strong>" : "Hello $nome, your account is now <strong style='color: #222; text-decoration: none;'>PRO</strong>") . "</p>
      </div>
    </div>
    ";
} else if ($subject == 'debug') {
  $body = "
    <div style='max-width:681px;  padding: 6em 0em; margin: 0 auto; background: #ffffff; display: grid'>
    
      <img src='http://agenciacapiba.com.br/app/qad/assets/logo.png' style='margin: 0 auto; margin-bottom: 3em;'>
      
      <h1 style='color:#1FBFCB; text-align: center; margin: 0 auto'>DEBUG</h1>
      
      <br>
      
      <div style='margin: 0 auto; width: 100%; margin-top: 3em'>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'>" . $mensagem . "</p>
      </div>
    </div>
    ";
    $destinatario = 'maycon.silva@capiba.com.br';
} else if ($subject == 'Meu Resultado' || $subject == 'Result of my evaluation') {
  $body = "
    <div style='max-width:681px;  padding: 6em 0em; margin: 0 auto; background: #ffffff; display: grid'>
    
      <img src='http://agenciacapiba.com.br/app/qad/assets/logo.png' style='margin: 0 auto; margin-bottom: 3em;'>

      <h2 style='color:#1FBFCB; text-align: center; margin: 0 auto'>". ( $pt ? "Olá, meu nome é $nome e estou compartilhando o resultado da minha avaliação no aplicativo QAD." : "Hello, my name is $nome, i am sharing the result of my assessment on the app QAD." ) ."</h2>
      
      <br>
      
      <div style='margin: 0 auto; width: 100%; margin-top: 3em'>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'><strong style='color: #222; text-decoration: none;'>" . ( $pt ? 'Resultado' : 'Result' ) . "</strong>: " . $data . "</p>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'><strong style='color: #222; text-decoration: none;'>" . ( $pt ? 'Escore' : 'Score' ) . "</strong>: " . $score . "</p>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'><strong style='color: #222; text-decoration: none;'>" . ( $pt ? 'Severidade' : 'Severity' ) . "</strong>: " . $severidade . "</p>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'><strong style='color: #222; text-decoration: none;'>" . ( $pt ? 'Resolução' : 'Resolution' ) . "</strong>: " . $resolucao . "</p>
      </div>

      <div style='margin: 0 auto; width: 100%; margin-top: 3em'>
        <p style='margin: 5px auto; font-size: 1.2em; text-align:center;'>" . ( $pt ? 'Baixe agora o QAD' : 'Download now' ) . "</p>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'><strong style='color: #222; text-decoration: none;'>Android</strong>: <a href='$android_app_link' style='color: #444; font-weight: bold; text-decoration: unset;'>Play Store</a> </p>
        <p style='margin: 0 auto; font-size: 1.2em; text-align:center;'><strong style='color: #222; text-decoration: none;'>IOS</strong>: <a href='$ios_app_link' style='color: #444; font-weight: bold; text-decoration: unset;'>Apple Store</a> </p>
      </div>
    </div>
    ";
} else {
  $destinatario = null;
}

if ($destinatario && $token == '3334E5D751CA7D5CEB5E8511DA38FFAA9B18E74692204112E686EA63ADD5F5DF2BD766DD8725D9AB6EB588D71F57A9E88C3EAB0CCDD21B9806E40E75631638A2') {
  //Descomente a linha abaixo caso revenda seja 'Plesk 12.5 Linux'
  //$mailer->SMTPSecure = 'tls';
   
  $mailer->SMTPAuth = true; //Define se haverá autenticação no SMTP
  $mailer->IsHTML(true);
  $mailer->Username = 'qad@agenciacapiba.com.br'; //Informe o e-mai o completo
  $mailer->Password = 'c@pib@2020'; //Senha da caixa postal
  $mailer->FromName = 'QAD'; //Nome que é exibido
  $mailer->From = 'qad@agenciacapiba.com.br'; //Utilizar a mesma caixa postal
  $mailer->AddAddress($destinatario); //Destinatários

  // $mailer->AddCC('igorazevedo.tavares@gmail.com', '');
  $mailer->Subject = $subject;
  $mailer->Body = $body;
  
  $mailer->Send();
  http_response_code(200);
  exit;
} else {
  http_response_code(400);
  die;
}


 
?>