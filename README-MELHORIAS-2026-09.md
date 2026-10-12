# Finanças Família — melhorias de setembro de 2026

## Atualização do aplicativo

O aplicativo agora usa o `service worker` `financas-familia-v4-20260917`, com atualização de rede para páginas HTML, `updateViaCache: "none"` e chamada explícita de `registration.update()` ao abrir. Isso corrige o problema em que o navegador continuava exibindo a versão antiga.

Quando uma publicação nova for feita, o usuário deve abrir o endereço do aplicativo uma vez com internet. O navegador buscará o novo HTML e o novo service worker. Se uma versão antiga continuar aparecendo, fechar todas as abas do app e abrir novamente normalmente resolve a troca do cache.

## Dados importados da planilha

O arquivo `excel_seed.json` foi gerado a partir de `Controle_Dividas_Apresentacao.xlsx`. Ele alimenta o app principal e o módulo `dividas.html` uma única vez por navegador.

Foram importadas cinco dívidas do Serasa:

| Credor | Valor com desconto informado |
|---|---:|
| Ipanema | R$ 18.049,38 |
| Anhanguera | R$ 1.884,09 |
| Mercado Pago — Empréstimo | R$ 4.392,97 |
| Mercado Pago — Conta | R$ 2.707,93 |
| Jeitto | R$ 189,14 |

Também foram importados 61 recebíveis do terreno, com entrada, parcelas recebidas e parcelas futuras. A soma dos valores preenchidos na agenda é **R$ 44.600,00**, sendo R$ 15.900,00 recebidos e R$ 28.700,00 em aberto.

> A planilha informa o valor do terreno como R$ 45.000,00, mas a soma da entrada de R$ 5.000,00, de 12 parcelas de R$ 500,00 e das 48 parcelas de R$ 700,00 resulta em R$ 44.600,00. Essa diferença foi preservada no relatório para conferência, sem inventar um valor adicional.

## Senha de acesso

A senha é armazenada apenas neste navegador, como um hash SHA-256 em `localStorage`. Ela bloqueia o acesso enquanto a sessão do navegador não for desbloqueada. É uma proteção local de privacidade, não um sistema de login ou autenticação em nuvem.

Para configurar: abra **Configuração → Senha de acesso**, informe uma nova senha com pelo menos quatro caracteres e confirme. Para remover, informe a senha atual e escolha **Remover senha**.

## Tema claro e escuro

Em **Configuração → Aparência**, o usuário pode alternar entre os temas **Escuro** e **Claro**. A preferência é salva no mesmo navegador junto às configurações do usuário.

## Relatório PDF

Em **Relatório**, o botão **Baixar relatório completo em PDF** gera um PDF localmente no navegador. O documento contém o resumo financeiro, todos os recebíveis do terreno, todas as despesas manuais e fixas cadastradas e as dívidas importadas da planilha.

A biblioteca `vendor/jspdf.umd.min.js` está incluída no projeto para que o PDF funcione também sem depender de uma biblioteca externa carregada pela internet.

## Arquivos importantes

- `index.html`: app principal e interface.
- `dividas.html`: módulo de negociação de dívidas.
- `app_enhanced.js`: código-fonte separado da lógica principal.
- `excel_seed.json`: dados convertidos da planilha anexada.
- `vendor/jspdf.umd.min.js`: biblioteca local para PDF.
- `manifest.json`: instalação no celular.
- `sw.js`: atualização e funcionamento offline.
- `icons/`: logo e ícones PWA.

## Logo

O logo foi substituído pela imagem enviada pelo usuário, com a mensagem “Deus guia meus passos, e eu planejo o meu futuro”. A imagem foi convertida para `icons/apple-touch-icon.png`, `icons/icon-192.png`, `icons/icon-512.png`, favicons e `logo-financas-familia.png`, para funcionar no cabeçalho, no navegador e no atalho do celular.

## Atualização de 12/10/2026

Foi integrada a planilha `Planejamento_Quitacao_Dividas_11_10_26.xlsx`, com 62 recebíveis do terreno, 5 dívidas do Serasa, 22 compromissos Ecovic e 3 cenários de simulação de empréstimo. O resumo da dívida agora usa os valores com desconto da nova planilha.

Também foi corrigido o layout para Android: a página ocupa a largura real do aparelho, os formulários ficam mais fáceis de tocar, os cards se reorganizam em telas pequenas e o espaço seguro do celular é respeitado. O cache do PWA foi atualizado para baixar essa versão nova.
