# Delifrios Sales Hub

Crie o "DX Vendas — Portal Delifrios", um portal de indicadores comerciais para a distribuidora Delifrios (Itaberaba-BA). Idioma: 100% português do Brasil. Stack: React + Tailwind + shadcn/ui + Recharts.

=== DESIGN SYSTEM DELIFRIOS (seguir à risca) ===
- Fundo do conteúdo SEMPRE neutro #F7F6F2; cartões brancos #FFFFFF, bordas #E7E4DC, radius 12px, sombra sutil.
- Cores da marca: amarelo #FFC609 (APENAS acentos: item ativo do menu, filtro selecionado, borda superior de KPI em destaque), vermelho #E23430 (botões primários; hover #C22823), grafite #262320 (sidebar).
- NUNCA usar fundo amarelo em áreas de conteúdo/leitura.
- Tipografia: títulos e números-herói em "Nunito" (800/900), corpo e tabelas em "Inter" (Google Fonts), números com font-variant-numeric: tabular-nums.
- Logo: placeholder de texto "Delifrios" em fonte Quicksand 700, vermelho #E23430 sobre chip amarelo #FFC609, com slogan "o sabor que aproxima" em fonte Caveat abaixo (será substituído pelo arquivo oficial depois).
- Status semânticos (reservados): positivo #0CA30C (texto #006300), atenção #FAB219, grave #EC835A, crítico/vencido #D03B3B. Sempre ícone/seta + cor, nunca cor sozinha.
- Séries de gráficos, ORDEM FIXA (cor segue a entidade, nunca o ranking; filtrar não repinta): 1 #D94436, 2 #2A78D6, 3 #EDA100, 4 #1BAF7A, 5 #4A3AA7, 6 #E87BA4; 7ª série em diante agrupa em "Outros" cinza #B9B4A9. Barras finas com cantos 4px, máximo 6 séries, UM eixo por gráfico (nunca eixo duplo), rótulos diretos nos valores.

=== LAYOUT ===
Sidebar fixa grafite #262320 à esquerda (220px, colapsa em ícones <1100px) com: Home, Vendas, Fornecedores, Clientes, Financeiro, Metas & Comissões, Admin. Item ativo: fundo amarelo translúcido + borda esquerda amarela 3px. Logo no topo da sidebar com selo "DX VENDAS".
Topbar de cada página: título + filtro de período segmentado [Dia | Semana atual | Mês atual] (padrão: Semana atual) + seletor de datas livre.

=== DADOS (Supabase JÁ EXISTE — conectar, não criar) ===
URL: https://rljsgatssqmqktojeksq.supabase.co
Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsanNnYXRzc3FtcWt0b2pla3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMjg3NDcsImV4cCI6MjEwMDYwNDc0N30.BNGCfvC_7oPj1GeEr1n6UwDQhP205-Vk2rDJeBAwAgU
NÃO criar tabelas novas — o banco já está modelado e sincronizado com o ERP Winthor a cada 15 min. Consumir estas views/tabelas (schema public):
- v_vendas_dia (data, faturamento, kg, rs_por_kg, clientes_atendidos, notas)
- v_vendas_fornecedor (data, fornecedor, pasta, destaque, faturamento, kg, clientes_positivados, margem_contribuicao)
- v_vendas_rca (data, codusur, vendedor, equipe, interno, comissionavel, faturamento, kg, clientes_atendidos, notas)
- v_positivacao_mes (mes, clientes_positivados, base_ativa, pct_positivacao)
- v_clientes_atividade (base_ativa, compraram_90d, compraram_180d, pct_90d, pct_180d)
- v_receber_buckets (a_vencer, vencido_ate_2d, vencido_3_a_7d, vencido_8_a_15d, vencido_16_a_30d, vencido_mais_30d, total_aberto)
- v_pagar_buckets (proximos_2d, de_3_a_10d, de_11_a_20d, de_21_a_30d, ja_vencidos, total_aberto)
- v_cliente_vida (codcli, razao_social, fantasia, cidade, codusur, rca, dt_ult_compra, ultima_compra_delifrios, aberto_total, vencido)
- fornecedor_pasta, vendedor_config, metas, regras_comissao, comissoes_apuradas, parametros, log_sync
Autenticação: Supabase Auth por e-mail/senha (a tabela usuarios_portal com perfis já existe: diretoria, supervisor, financeiro, admin, rca).

=== PÁGINAS v1 ===
1. LOGIN: card centrado, logo, e-mail/senha, fundo grafite com detalhe amarelo.
2. HOME: KPIs em cartões (Faturamento do período com comparativo, Kg vendido, R$/kg, Clientes positivados no mês vs base ativa 687, Margem de contribuição [marcar "restrito" — só perfis supervisor/diretoria], Contas a receber vencidas, Contas a pagar próximos dias) + gráfico barras "Vendas por fornecedor" + gráfico barras "Vendas por RCA" agrupado por equipe (Atacado/Distribuição; vendedores com interno=true aparecem como "Vendas Internas" agregado) + linha "Evolução diária do faturamento".
3. VENDAS: evolução diária (linha), comparativo mês anterior, tabela por RCA (faturamento, kg, positivação, notas).
4. FORNECEDORES: abas por pasta (Atacado | Distribuição), cards por fornecedor destaque (BRF, Avigran, Piracanjuba, Danone, Easychef, Santa Massa) + grupo "Outros"; página de detalhe com evolução, kg, positivação.
5. CLIENTES: cards do v_clientes_atividade (base ativa 687, compraram 90d, compraram 180d) + tabela v_cliente_vida com busca e filtros (sem compra no mês, com títulos vencidos).
6. FINANCEIRO: buckets de contas a receber e a pagar (colunas/cards) + totais.
7. METAS & COMISSÕES: placeholder estruturado ("em construção") com tabela de metas cadastradas.
8. ADMIN: status da sincronização (log_sync: última execução, registros, erros) + lista de parâmetros.
Formato: R$ pt-BR sem centavos nos cards, com centavos no detalhe; datas dd/mm.
Por enquanto SEM restrição por carteira de RCA (entra depois) — mas o card de margem já deve respeitar o perfil do usuário logado via usuarios_portal.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dxvendas-delifrios.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/490d7cf1-6b86-4528-8453-a94fc5e4db3b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
