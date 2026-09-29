/**
 * STEP 3: Swing GUI 메모장 (Java)
 *
 * app.html의 "App제작" 메뉴 STEP 3에 해당하는 예제입니다.
 * STEP 1, 2는 콘솔(텍스트)만 다뤘다면, 이번엔 실제 창(GUI)을 띄우고
 * 버튼 클릭·메뉴 선택 같은 "이벤트"에 반응하는 프로그램을 만듭니다.
 *
 * 기능: 새 파일 / 열기 / 저장 / 다른 이름으로 저장, 제목표시줄에 파일명 + 수정 여부 표시
 *
 * 실행 방법 (VS Code): main 메서드 위의 Run 버튼 클릭
 * 실행 방법 (터미널):
 *   javac Step3Notepad.java
 *   java Step3Notepad
 */

import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import javax.swing.JOptionPane;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import java.awt.Font;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

public class Step3Notepad extends JFrame {

    private final JTextArea textArea = new JTextArea();
    private File currentFile = null;   // 아직 저장한 적 없으면 null
    private boolean modified = false;  // 마지막 저장 이후 수정되었는지

    public Step3Notepad() {
        super("제목 없음 — codestudio 메모장");
        setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE); // 저장 확인을 직접 처리하기 위해
        setSize(700, 500);
        setLocationRelativeTo(null); // 화면 가운데 배치

        textArea.setFont(new Font("맑은 고딕", Font.PLAIN, 15));
        textArea.setLineWrap(true);
        add(new JScrollPane(textArea));

        // 글자가 바뀔 때마다 "수정됨" 표시를 갱신한다
        textArea.getDocument().addDocumentListener(new DocumentListener() {
            @Override
            public void insertUpdate(DocumentEvent e) { markModified(); }

            @Override
            public void removeUpdate(DocumentEvent e) { markModified(); }

            @Override
            public void changedUpdate(DocumentEvent e) { markModified(); }
        });

        setJMenuBar(buildMenuBar());

        // 창의 X 버튼을 눌렀을 때도 저장 확인을 거치도록 연결
        addWindowListener(new java.awt.event.WindowAdapter() {
            @Override
            public void windowClosing(java.awt.event.WindowEvent e) {
                exitApp();
            }
        });
    }

    private JMenuBar buildMenuBar() {
        JMenuBar menuBar = new JMenuBar();
        JMenu fileMenu = new JMenu("파일");

        JMenuItem newItem = new JMenuItem("새로 만들기");
        newItem.addActionListener(e -> newFile());

        JMenuItem openItem = new JMenuItem("열기...");
        openItem.addActionListener(e -> openFile());

        JMenuItem saveItem = new JMenuItem("저장");
        saveItem.addActionListener(e -> saveFile(false));

        JMenuItem saveAsItem = new JMenuItem("다른 이름으로 저장...");
        saveAsItem.addActionListener(e -> saveFile(true));

        JMenuItem exitItem = new JMenuItem("종료");
        exitItem.addActionListener(e -> exitApp());

        fileMenu.add(newItem);
        fileMenu.add(openItem);
        fileMenu.addSeparator();
        fileMenu.add(saveItem);
        fileMenu.add(saveAsItem);
        fileMenu.addSeparator();
        fileMenu.add(exitItem);

        menuBar.add(fileMenu);
        return menuBar;
    }

    private void markModified() {
        modified = true;
        updateTitle();
    }

    private void updateTitle() {
        String name = currentFile != null ? currentFile.getName() : "제목 없음";
        setTitle((modified ? "*" : "") + name + " — codestudio 메모장");
    }

    // 저장하지 않은 변경사항이 있으면 물어보고, "취소"를 누르면 false를 돌려준다 (다음 동작을 진행하지 말라는 뜻)
    private boolean confirmDiscardChanges() {
        if (!modified) {
            return true;
        }
        int choice = JOptionPane.showConfirmDialog(
                this, "저장하지 않은 내용이 있습니다. 저장할까요?", "확인",
                JOptionPane.YES_NO_CANCEL_OPTION);

        if (choice == JOptionPane.CANCEL_OPTION || choice == JOptionPane.CLOSED_OPTION) {
            return false;
        }
        if (choice == JOptionPane.YES_OPTION) {
            return saveFile(false);
        }
        return true; // NO_OPTION: 저장하지 않고 진행
    }

    private void newFile() {
        if (!confirmDiscardChanges()) {
            return;
        }
        textArea.setText("");
        currentFile = null;
        modified = false;
        updateTitle();
    }

    private void openFile() {
        if (!confirmDiscardChanges()) {
            return;
        }
        JFileChooser chooser = new JFileChooser();
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) {
            return;
        }
        try {
            String content = Files.readString(chooser.getSelectedFile().toPath(), StandardCharsets.UTF_8);
            textArea.setText(content);
            currentFile = chooser.getSelectedFile();
            modified = false;
            updateTitle();
        } catch (IOException e) {
            JOptionPane.showMessageDialog(this, "파일을 여는 중 오류: " + e.getMessage(),
                    "오류", JOptionPane.ERROR_MESSAGE);
        }
    }

    // saveAs가 true면 항상 다른 이름으로 저장 대화상자를 띄운다. 성공하면 true 반환.
    private boolean saveFile(boolean saveAs) {
        File target = currentFile;
        if (saveAs || target == null) {
            JFileChooser chooser = new JFileChooser();
            if (chooser.showSaveDialog(this) != JFileChooser.APPROVE_OPTION) {
                return false;
            }
            target = chooser.getSelectedFile();
        }

        try {
            Files.writeString(target.toPath(), textArea.getText(), StandardCharsets.UTF_8);
            currentFile = target;
            modified = false;
            updateTitle();
            return true;
        } catch (IOException e) {
            JOptionPane.showMessageDialog(this, "저장 중 오류: " + e.getMessage(),
                    "오류", JOptionPane.ERROR_MESSAGE);
            return false;
        }
    }

    private void exitApp() {
        if (confirmDiscardChanges()) {
            dispose();
            System.exit(0);
        }
    }

    public static void main(String[] args) {
        // Swing 화면 작업은 항상 이 방식(invokeLater)으로 시작하는 것이 안전합니다.
        SwingUtilities.invokeLater(() -> new Step3Notepad().setVisible(true));
    }
}
