const db = require('../config/db');
const crypto = require('crypto');

/**
 * Emissão e download de certificado de participação em evento acadêmico
 * Matriz RBAC:
 * - ADMIN: ✓
 * - EDITOR: ✓
 * - USER: ✓ (Apenas das suas próprias inscrições)
 * - PÚBLICO: ✖
 */
exports.getById = async (req, res) => {
    const paramId = parseInt(req.params.id);

    if (isNaN(paramId)) {
        return res.status(400).json({ error: 'Identificador do certificado ou inscrição inválido.' });
    }

    try {
        // Busca associando certificado, inscrição, participante e evento
        const query = `
            SELECT 
                c.id as certificate_id,
                c.certificate_code,
                c.issued_at,
                s.id as subscription_id,
                s.user_id,
                COALESCE(s.attended, false) as attended,
                u.name as participant_name,
                u.email as participant_email,
                e.id as event_id,
                e.title as event_title,
                e.description as event_description,
                e.event_date,
                e.location as event_location,
                COALESCE(e.status, 'OPEN') as event_status,
                COALESCE(e.workload_hours, 20)::int as workload_hours
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            JOIN events e ON s.event_id = e.id
            LEFT JOIN certificates c ON s.id = c.subscription_id
            WHERE c.id = $1 OR s.id = $1
            ORDER BY c.id DESC NULLS LAST
            LIMIT 1
        `;

        const result = await db.query(query, [paramId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Certificado ou inscrição não encontrada.' });
        }

        const data = result.rows[0];

        // [Regra RBAC PDF]: USER só pode emitir/baixar certificados de suas próprias inscrições
        if (req.user.role === 'USER' && data.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permissão negada. Você só pode emitir ou baixar certificados associados às suas próprias inscrições.'
            });
        }

        // =========================================================================
        // REGRAS DE NEGÓCIO DE CERTIFICAÇÃO ACADÊMICA:
        // 1. O evento deve ter sido finalizado/concluído pelo ADMIN (status = 'COMPLETED')
        // 2. A presença do participante deve ter sido confirmada pelo EDITOR ou ADMIN (attended = true)
        // 3. Estar apenas inscrito NÃO garante certificado. Se não confirmado, fica bloqueado com feedback.
        // =========================================================================
        if (req.user.role === 'USER') {
            if (data.event_status !== 'COMPLETED') {
                return res.status(400).json({
                    error: 'Certificado indisponível. O evento acadêmico ainda não foi finalizado e concluído pela administração.',
                    code: 'EVENT_NOT_COMPLETED',
                    feedback: 'Os certificados são liberados após o encerramento oficial do evento pelo Administrador.'
                });
            }

            if (!data.attended) {
                return res.status(403).json({
                    error: 'Certificado bloqueado. Sua presença não foi confirmada pela coordenação do evento.',
                    code: 'ATTENDANCE_NOT_CONFIRMED',
                    feedback: 'O simples fato de estar inscrito não garante a certificação. É necessária a confirmação de presença (check-in) pelo Coordenador/Editor.'
                });
            }
        }

        // Se a inscrição existe mas o certificado ainda não tinha registro na tabela
        let certCode = data.certificate_code;
        let issuedAt = data.issued_at;
        let certId = data.certificate_id;

        if (!certCode) {
            certCode = `CERT-${data.event_id}-${data.subscription_id}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            const certInsert = await db.query(
                `INSERT INTO certificates (subscription_id, certificate_code)
                 VALUES ($1, $2)
                 RETURNING id, certificate_code, issued_at`,
                [data.subscription_id, certCode]
            );
            certId = certInsert.rows[0].id;
            issuedAt = certInsert.rows[0].issued_at;
        }

        // Retorna o certificado emitido com layout acadêmico completo e assinaturas
        res.json({
            status: 'VALID',
            certificate: {
                id: certId,
                code: certCode,
                issued_at: issuedAt,
                workload_hours: data.workload_hours,
                participant: {
                    id: data.user_id,
                    name: data.participant_name,
                    email: data.participant_email
                },
                event: {
                    id: data.event_id,
                    title: data.event_title,
                    description: data.event_description,
                    date: data.event_date,
                    location: data.event_location,
                    status: data.event_status,
                    workload_hours: data.workload_hours
                },
                declaration: `Certificamos para os devidos fins curriculares e acadêmicos que ${data.participant_name} participou e concluiu com êxito as atividades programadas do evento acadêmico "${data.event_title}", realizado em ${new Date(data.event_date).toLocaleDateString('pt-BR')} no local ${data.event_location || 'Campus Universitário Central'}, integralizando a carga horária de ${data.workload_hours} horas de atividades complementares.`,
                signatures: [
                    {
                        name: 'Prof. Dr. Roberto Albuquerque',
                        role: 'Coordenador Acadêmico de Extensão',
                        institution: 'Centro Universitário Ateneu'
                    },
                    {
                        name: 'Dra. Helena Vasconcelos',
                        role: 'Diretoria de Ensino e Pesquisa',
                        institution: 'Centro Universitário Ateneu'
                    }
                ],
                verification_url: `/certificates/validate/${certCode}`
            }
        });
    } catch (error) {
        console.error('[CertificateController.getById] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao emitir certificado.' });
    }
};

/**
 * Validação pública de autenticidade de certificado via código
 * Matriz RBAC: PÚBLICO ✓ | USER ✓ | EDITOR ✓ | ADMIN ✓
 */
exports.validateCode = async (req, res) => {
    const { code } = req.params;

    if (!code) {
        return res.status(400).json({ error: 'Código de verificação é obrigatório.' });
    }

    try {
        const query = `
            SELECT 
                c.id as certificate_id,
                c.certificate_code,
                c.issued_at,
                u.name as participant_name,
                e.title as event_title,
                e.event_date
            FROM certificates c
            JOIN subscriptions s ON c.subscription_id = s.id
            JOIN users u ON s.user_id = u.id
            JOIN events e ON s.event_id = e.id
            WHERE UPPER(c.certificate_code) = UPPER($1)
        `;

        const result = await db.query(query, [code.trim()]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                valid: false,
                message: 'Código de certificado não encontrado ou inválido.'
            });
        }

        const cert = result.rows[0];
        res.json({
            valid: true,
            certificate: {
                code: cert.certificate_code,
                issued_at: cert.issued_at,
                participant_name: cert.participant_name,
                event_title: cert.event_title,
                event_date: cert.event_date
            }
        });
    } catch (error) {
        console.error('[CertificateController.validateCode] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao validar certificado.' });
    }
};
