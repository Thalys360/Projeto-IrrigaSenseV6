# IrrigaSense 2.0 — v2 menu corrigido

Esta revisão corrige o menu lateral para funcionar de forma mais confiável no celular e no computador.

## Correções
- Botão ☰ funciona com fallback em CSS, mesmo quando um visualizador bloqueia JavaScript.
- Itens do menu agora também são links reais para as seções.
- No celular, o menu abre por cima da página e fecha após selecionar uma opção quando JavaScript está disponível.
- Mantidas todas as telas e funções demonstrativas anteriores.

## Observação
Para integração real com Arduino, ESP-01 e Firebase, ainda será feita uma etapa específica de backend/autenticação.


## Correções v3
- Instagram corrigido:
  - Thalys: @__thalys._
  - Maria Eduarda: @eduardasales.__
- Menu lateral fecha automaticamente ao escolher uma opção.
- As 22 opções de cultura aparecem diretamente no HTML e também são carregadas pelo JavaScript.
- O botão "Desbloquear modo manual" abre corretamente a janela de PIN.
- Mantido PIN de demonstração: 2026.

## v4
- Campo do PIN do modo manual agora aparece diretamente na aba, sem depender de modal.
- Menu usa também um mecanismo HTML/CSS para fechar ao selecionar uma opção.
- Cada opção de cultura mostra sua faixa padrão no próprio menu.
- Em navegador normal, selecionar a cultura preenche automaticamente os campos mínimo e máximo.
- Observação: visualizadores internos podem bloquear JavaScript; a versão publicada em GitHub Pages executará essas rotinas normalmente.
