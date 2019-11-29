import * as React from "react";
import { useRef, useImperativeHandle, useEffect } from "react";
import styled from "styled-components";
import delay from "delay";
import {
  BrowserRouter as Router,
  Route,
  Switch,
  useParams,
  useHistory
} from "react-router-dom";
import { render } from "react-dom";
import { TodoApp } from "./todo";
const ContentWrapper = styled.div``;
const NavContainer = styled.div``;
async function fakeApi(id: string) {
  await delay(1000);
  return id + ".mp3";
}
// 使用forwardRef将ref和组件内部绑定
// 通过React.AudioHTMLAttributes支持透传dom属性
const Audio = React.forwardRef(
  (
    props: { id: string } & React.AudioHTMLAttributes<HTMLAudioElement>,
    ref
  ) => {
    // 使用useRef和dov进行绑定，需要泛型指明类型，否则绑定会类型报错
    const audioRef = useRef<HTMLAudioElement>(null);
    const [src, setSrc] = React.useState("");
    // 通过useImperativeHandler暴露内部api
    useImperativeHandle(ref, () => ({
      play: () => {
        audioRef.current && audioRef.current.play();
      },
      stop: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }
    }));
    useEffect(() => {
      fakeApi(props.id).then(src => {
        setSrc(src);
      });
    }, [props.id]);
    return <audio ref={audioRef} src={src} />;
  }
);
// 没有childrend的话不要用FC
const HomePage = () => {
  return <div>home</div>;
};
const Nav = () => {
  const history = useHistory();
  return (
    <>
      <button type="button" onClick={() => history.push("/home")}>
        Go home
      </button>
      <button type="button" onClick={() => history.push("/item/122")}>
        Go Blog 1
      </button>
    </>
  );
};
const Blog = () => {
  // 这里可以标注泛型参数用于类型检查
  const { item_id } = useParams<{
    item_id: string;
  }>();
  return (
    <>
      <h1>blog:</h1>
      <TodoApp />
      <Audio
        id={item_id}
        onEnded={() => {
          console.log("music ended");
        }}
      />
    </>
  );
};
// 含有chuildren的可以使用FC，默认自动注入children
const Layout: React.FC = props => {
  return (
    <>
      <NavContainer>
        <Nav />
      </NavContainer>
      <ContentWrapper>
        <div>{props.children}</div>
      </ContentWrapper>
    </>
  );
};
function App() {
  return (
    <Router>
      <Switch>
        <Layout>
          <Route exact path="/home" component={HomePage} />
          <Route path="/item/:itemid" component={Blog} />
        </Layout>
      </Switch>
    </Router>
  );
}

const rootElement = document.getElementById("root");
render(<App />, rootElement);
