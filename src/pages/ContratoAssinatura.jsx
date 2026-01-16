import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';

// Contrato integral com formatação e cláusulas completas
const contratoHtml = (aluno, aceitou, assinatura) => {
  const contratanteName = aluno?.responsibleName || aluno?.name || '_________________';
  const contratanteCpf = aluno?.responsibleCpf || aluno?.cpf || '_________________';
  const contratanteContact = aluno?.responsibleContact || aluno?.contact || '-';
  const vencimento = aluno?.dueDate ? new Date(aluno.dueDate).getDate() : '-';
  const carimbo = assinatura && assinatura.timestamp
    ? `<div style=\"margin-top:8px;font-size:11px;color:#64748b;\">Assinado digitalmente por: <b>${assinatura.nome}</b> (CPF: ${assinatura.cpf})<br>Data e hora: ${assinatura.timestamp}${assinatura.ip ? `<br>IP: ${assinatura.ip}` : ''}</div>`
    : '';
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.3; padding: 20px 32px; background: #fff;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div>
        <h1 style="font-size: 18px; margin-bottom: 3px;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS</h1>
        <p style="font-size: 10px; color: #94a3b8;">Emitido em: ${(new Date()).toLocaleDateString('pt-BR')}</p>
      </div>
      <div><img style="width: 120px; filter: brightness(0);" src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="Logo"/></div>
    </div>
    <div style="border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px; margin-bottom: 10px; background: #f8fafc;">
      <h2 style="font-size: 13px; margin-bottom: 4px;">Quadro Resumo</h2>
      <p><strong>CONTRATANTE:</strong> ${contratanteName} • CPF: ${contratanteCpf} • Contato: ${contratanteContact}</p>
      <p><strong>ALUNO:</strong> ${aluno?.name}</p>
      <p><strong>CURSO / PROFESSOR:</strong> ${aluno?.course || '-'} / ${aluno?.teacher || '-'}</p>
      <p><strong>Mensalidade:</strong> R$ ${Number(aluno?.fee||0).toLocaleString('pt-BR',{minimumFractionDigits:2})} • <strong>Parcelas:</strong> ${aluno?.installments || 12} • <strong>Vencimento:</strong> dia ${vencimento}</p>
      <p><strong>CONTRATADA:</strong> SpeakUp English Language Academy, pessoa jurídica de direito privado, inscrita no CNPJ sob o n.º 28.649.636/0001-88, sediada na Praça Governador Valadares, 119, Centro - Cataguases, MG.</p>
    </div>
    <div style="margin-top: 8px;">
      <p>As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços Educacionais, que se regerá pelas cláusulas seguintes e pelas condições de preço, forma e termo de pagamento descritas no presente.</p>
      <h3 style="font-size: 12px; margin-top: 8px; margin-bottom: 3px; font-weight: bold;">CLÁUSULA PRIMEIRA - OBJETO DO CONTRATO E SUA VIGÊNCIA</h3>
      <p>1.1. O presente contrato tem por objeto a prestação de serviços educacionais de ensino da Língua Inglesa pela CONTRATADA ao ALUNO, conforme o plano pedagógico e calendário da escola.</p>
      <p>1.2. A CONTRATADA reserva-se o direito de substituir professores ao longo do curso por razões pedagógicas, administrativas ou de força maior, visando sempre a continuidade do serviço e a manutenção da qualidade de ensino, não havendo vinculação obrigatória do ALUNO a um docente específico.</p>
      <p>1.3. O contrato entra em vigor na data de sua assinatura.</p>
      <p>1.4. A vigência será até o término do ano letivo contratado. Podendo ser renovado automaticamente.</p>
      <h3 style="font-size: 12px; margin-top: 8px; margin-bottom: 3px; font-weight: bold;">CLÁUSULA SEGUNDA - OBRIGAÇÕES DA CONTRATADA</h3>
      <p>2.1. São obrigações da CONTRATADA: a) Prestar os serviços educacionais conforme seu planejamento pedagógico; b) Definir, com autonomia, calendário, professores, critérios de avaliação, metodologia e carga horária; c) Emitir certificado ao final do curso, quando aplicável.</p>
      <h3 style="font-size: 12px; margin-top: 8px; margin-bottom: 3px; font-weight: bold;">CLÁUSULA TERCEIRA - PAGAMENTO</h3>
      <p>3.1. O CONTRATANTE realizará o pagamento das mensalidades via PIX, boleto ou cartão até a data de vencimento estipulada no item II.</p>
      <p>3.2. O não recebimento de notificações ou boletos via canais digitais não isenta o CONTRATANTE do pagamento pontual.</p>
      <p>3.3. Reajuste: Caso o contrato seja renovado ou se estenda por período superior a 12 (doze) meses, o valor da mensalidade será reajustado anualmente pela variação positiva do IPCA (IBGE), ou outro índice oficial que venha a substituí-lo.</p>
      <h3 style="font-size: 12px; margin-top: 8px; margin-bottom: 3px; font-weight: bold;">CLÁUSULA QUARTA - MORA</h3>
      <p>4.1. Em caso de atraso, incidirá sobre o valor da parcela multa moratória de 2% (dois por cento) e juros de mora de 1% (um por cento) ao mês, calculados proporcionalmente aos dias de atraso (pro rata die).</p>
      <p>4.2. O atraso superior a 30 dias autoriza a CONTRATADA a realizar a cobrança via órgãos de proteção ao crédito (SPC/SERASA), após notificação prévia escrita.</p>
      <h3 style="font-size: 12px; margin-top: 8px; margin-bottom: 3px; font-weight: bold;">CLÁUSULA QUINTA - MATERIAL DIDÁTICO</h3>
      <p>5.1. O material didático é indispensável para o aproveitamento pedagógico e não está incluso no valor das mensalidades, devendo ser adquirido separadamente. Uma vez entregue ao ALUNO ou acessado em plataforma digital, não haverá reembolso dos valores pagos pelo material em caso de desistência do curso.</p>
      <p>5.2. É expressamente proibida a utilização de cópias reprográficas (xerox) ou materiais piratas nas dependências da escola ou ambientes virtuais, sob pena de violação de direitos autorais e desligamento imediato.</p>
      <h3 style="font-size: 12px; margin-top: 8px; margin-bottom: 3px; font-weight: bold;">CLÁUSULA SEXTA - REPOSIÇÕES E FALTAS</h3>
      <p>6.1. Faltas, atrasos ou saídas antecipadas por iniciativa do ALUNO não dão direito a desconto, reembolso ou reposição de aula.</p>
      <p>6.2. A reposição de aulas ocorrerá exclusivamente quando o cancelamento da aula for de iniciativa da CONTRATADA.</p>
      <p>6.3. No caso de aulas online, problemas técnicos decorrentes da conexão de internet do aluno não serão passíveis de reposição.</p>
      <h3 style="font-size: 12px; margin-top: 8px; margin-bottom: 3px; font-weight: bold;">CLÁUSULA SÉTIMA - DA RESCISÃO</h3>
      <p>7.1. No Plano Mensal: A rescisão pode ocorrer a qualquer tempo, mediante aviso prévio por escrito (ou canal oficial de atendimento) com antecedência mínima de 30 (trinta) dias.</p>
      <p>7.2. No Plano Anual: Por se tratar de um plano com reserva de vaga e custos operacionais provisionados para o período letivo, a rescisão antecipada pelo CONTRATANTE implicará no pagamento de multa de 10% (10 por cento) sobre o valor total das parcelas restantes do contrato.</p>
      <p>7.3. Em caso de rescisão, não haverá reembolso de parcelas já pagas ou de aulas já ministradas. O mês em curso será cobrado integralmente.</p>
      <h3 style="font-size: 12px; margin-top: 8px; margin-bottom: 3px; font-weight: bold;">CLÁUSULA OITAVA - USO DE IMAGEM E DADOS PESSOAIS (LGPD)</h3>
      <p>8.1. Autorização de uso de imagem e voz: O CONTRATANTE autoriza expressamente a CONTRATADA a utilizar, de forma gratuita, a imagem e a voz do ALUNO para fins exclusivamente pedagógicos e de divulgação institucional, incluindo redes sociais, site oficial e materiais impressos da escola.</p>
      <p>8.2. ALUNOS MENORES DE IDADE: Caso o ALUNO seja menor de 18 (dezoito) anos, a autorização prevista no item 8.1 é concedida, neste ato, por seu responsável legal (CONTRATANTE), em estrita observância ao Estatuto da Criança e do Adolescente (Lei nº 8.069/1990), garantindo-se que o uso da imagem não seja vexatório nem exponha o menor a situações inadequadas.</p>
      <p>8.3. Proteção de Dados (LGPD): A CONTRATADA declara que realiza o tratamento de dados pessoais do CONTRATANTE e do ALUNO em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), limitando-se ao estritamente necessário para a execução deste contrato, emissão de notas fiscais e cumprimento de obrigações legais.</p>
      <p>8.4. Revogação: O consentimento para o uso de imagem poderá ser revogado a qualquer tempo pelo CONTRATANTE, mediante solicitação formal por escrito, sem que isso gere qualquer ônus ou rescisão das demais obrigações contratuais.</p>
      <p>8.5. A CONTRATADA compromete-se a tratar os dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), para fins de execução deste contrato e obrigações fiscais.</p>
      <h3 style="font-size: 12px; margin-top: 8px; margin-bottom: 3px; font-weight: bold;">CLÁUSULA NONA – FORO</h3>
      <p>9.1. Fica eleito o foro da Comarca de Cataguases/MG para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a qualquer outro por mais privilegiado que seja.</p>
      
    </div>
    <div style="margin-top: 24px; display: flex; justify-content: space-between;">
      <div style="width: 45%; text-align: center; font-size: 10px;">
        <p><strong>CONTRATANTE</strong></p>
        <div style="border-top: 1px solid #000; margin-top: 32px; padding-top: 3px;">${contratanteName}<br/>CPF: ${contratanteCpf}</div>
      </div>
      <div style="width: 45%; text-align: center; font-size: 10px;">
        <p><strong>CONTRATADA</strong></p>
        <div style="border-top: 1px solid #000; margin-top: 32px; padding-top: 3px;">SPEAKUP ENGLISH LANGUAGE ACADEMY<br/>CNPJ: 28.649.636/0001-88</div>
      </div>
    </div>
    <div style="margin-top: 32px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; background: #f1f5f9; max-width: 420px; margin-left: auto; margin-right: auto;">
      ${carimbo}
    </div>
    <div style="color: #059669; font-size: 15px; margin-top: 24px; text-align: center; ${aceitou ? '' : 'display:none;'}">
      Assinatura registrada com sucesso! O download do contrato foi iniciado.<br/>
      <span style="color: #64748b; font-size: 13px;">Você pode fechar esta página.</span>
    </div>
  </div>
  `;
};


import { useEffect } from 'react';

export default function ContratoAssinatura() {
  const { id } = useParams();
  const { students } = useData();
  const aluno = students.find(s => s.id === id);
  const [form, setForm] = useState({ nome: '', cpf: '', aceite: false });
  const [assinado, setAssinado] = useState(false);
  const [erro, setErro] = useState('');
  const [assinatura, setAssinatura] = useState(null); // { nome, cpf, timestamp, ip }
  const [ip, setIp] = useState('');

  // Buscar IP público do usuário
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIp(data.ip))
      .catch(() => setIp(''));
  }, []);

  function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    return true;
  }

  const handleInput = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAssinar = e => {
    e.preventDefault();
    setErro('');
    if (!form.nome.trim()) {
      setErro('Informe o nome completo.');
      return;
    }
    if (!form.cpf.trim() || !validarCPF(form.cpf)) {
      setErro('Informe um CPF válido.');
      return;
    }
    if (!form.aceite) {
      setErro('Você deve aceitar os termos do contrato.');
      return;
    }
    const now = new Date();
    setAssinatura({
      nome: form.nome.trim(),
      cpf: form.cpf.replace(/\D/g, ''),
      timestamp: now.toLocaleString('pt-BR', { hour12: false }),
      ip: ip
    });
    setAssinado(true);
    setTimeout(() => handleDownload(form.nome.trim(), form.cpf.replace(/\D/g, ''), now, ip), 500);
  };

  const handleDownload = (nome, cpf, data, ipAddr) => {
    const html = contratoHtml(aluno, true, { nome, cpf, timestamp: data ? data.toLocaleString('pt-BR', { hour12: false }) : (new Date()).toLocaleString('pt-BR', { hour12: false }), ip: ipAddr });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-assinado-${aluno?.name?.replace(/\s+/g, '_')||'aluno'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!aluno) {
    return <div style={{ maxWidth: 600, margin: '40px auto', color: 'red', fontWeight: 'bold' }}>Aluno não encontrado.</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 32 }}>
      <div dangerouslySetInnerHTML={{ __html: contratoHtml(aluno, assinado, assinatura) }} />
      {!assinado && (
        <form style={{ marginTop: 32, border: '1px solid #e5e7eb', borderRadius: 6, padding: 16, background: '#f1f5f9' }} onSubmit={handleAssinar} autoComplete="off">
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Nome completo <span style={{ color: 'red' }}>*</span></label>
            <input name="nome" value={form.nome} onChange={handleInput} required style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 4, padding: 8 }} placeholder="Digite seu nome completo" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>CPF <span style={{ color: 'red' }}>*</span></label>
            <input name="cpf" value={form.cpf} onChange={handleInput} required style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 4, padding: 8 }} placeholder="Digite seu CPF" maxLength={14} inputMode="numeric" />
          </div>
          <label style={{ display: 'block', marginBottom: 10 }}>
            <input type="checkbox" name="aceite" checked={form.aceite} onChange={handleInput} style={{ marginRight: 6 }} />
            Li e concordo com os termos do contrato
          </label>
          {erro && <div style={{ color: 'red', fontSize: 14, marginBottom: 8 }}>{erro}</div>}
          <button type="submit" style={{ background: '#005DE4', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 24px', fontSize: 15, cursor: 'pointer', marginTop: 8 }}>Assinar digitalmente</button>
        </form>
      )}
      {assinado && (
        <div style={{ color: '#059669', fontSize: 15, marginTop: 24, textAlign: 'center' }}>
          Assinatura registrada com sucesso! O download do contrato foi iniciado.<br/>
          <span style={{ color: '#64748b', fontSize: 13 }}>Você pode fechar esta página.</span>
        </div>
      )}
    </div>
  );
}
