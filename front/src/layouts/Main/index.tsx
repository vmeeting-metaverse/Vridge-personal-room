import { useHookstate } from "@hookstate/core";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import UnityPlayer from "../../components/UnityPlayer";
import LocalMedia from "../../components/Vmeeting/LocalMedia";
import { useVmeetingSpace } from "../../libs/vmeeting/hooks";
import { useUnity } from "../../providers/Unity";
import { useVmeeting } from "../../providers/Vmeeting";
import { globalState } from "../../states";
import style from './MainLayout.module.scss';
import jwt_decode from 'jwt-decode';

import chatSocket from '../../modules/chat/chatSocket';
import { VmeetingUser } from "../../libs/vmeeting/user";
import RemoteList from "../../components/Vmeeting/RemoteList";
import CandidateToasts from "../../components/CandidateToasts";
import FullView from "../../components/Vmeeting/FullView";
import { Outlet, useNavigate } from "react-router-dom";
import PrivateModal from "../../components/Sidebar/Space/PrivateModal";
import { deleteSpaceById, getSpaceById, getSpaceByName, getSpaceType, participateSpaceById } from "../../apis/space";
import { toast } from "react-toastify";
import { t } from "i18next";
import { useLocation } from "react-use";
import LoadingGif from '../../images/loading-buffering.gif';

interface Props {
  children?: JSX.Element;
}

const MainLayout = ({ children }: Props) => {
  const unityContext = useUnity();
  const app = useVmeeting();
  const { enterSpace: _enterSpace, exitSpace: _exitSpace, nowRoomParticipants: conferenceRoomParticipants, nowPresenters: presenters } = useVmeetingSpace(unityContext);

  const curSpace = useHookstate(globalState.currentSpace);
  const isUnityLoadedHook = useHookstate(globalState.isUnityLoaded);
  const spaceTypes = useHookstate(globalState.spaceTypes);
  const curMediaboardNetId = useHookstate(globalState.currentMediaboardNetId);
  const me = useHookstate(globalState.user);

  useEffect(() => {
    const init = async () => {
      if (spaceTypes.get().length === 0) {
        const jwt = localStorage.getItem('ws-jwt');
        if (!jwt) {
          return;
        }
        const result = await getSpaceType(jwt);
        const rawSpaceTypeList = result.data.spaceTypes;
        spaceTypes.set(rawSpaceTypeList);
      }
    };
    init();

  }, []);
  const [lobbyMode, setLobbyMode] = useState(false);
  const [currentSpaceId, setCurrentSpaceId] = useState('');

  useEffect(() => {
    const jwt = localStorage.getItem('ws-jwt');
    if (!jwt) {
      setLobbyMode(false);
      return;
    }
    const decoded = jwt_decode(jwt) as { userId: string };
    if (
      curSpace.get() &&
      decoded.userId === curSpace.get().ownerId &&
      curSpace.get().lobbyYN
    ) {
      setCurrentSpaceId(curSpace.get().id || '');
      setLobbyMode(true);
    } else {
      setLobbyMode(false);
    }

    if (!chatSocket.connected) {
      chatSocket.connect();
    }
  }, [curSpace.value]);

  const [focusedUser, setFocusedUser] = useState<VmeetingUser>();

  useEffect(() => {
    if (focusedUser) {
      let isLeft = true;
      if (presenters.get(focusedUser.id)) {
        isLeft = false;
        setFocusedUser(presenters.get(focusedUser.id));
      }
      if (conferenceRoomParticipants.get(focusedUser.id)) {
        isLeft = false;
        setFocusedUser(presenters.get(focusedUser.id));
      }
      if (isLeft) {
        setFocusedUser(undefined);
      }
    }
  }, [presenters, conferenceRoomParticipants]);

  const [isPrivateModalOpen, setIsPrivateModalOpen] = useState(false);
  const [targetSpaceId, setTargetSpaceId] = useState<string>();

  const onParticipate = async (spaceInfo: any, form: any) => {
    try {
      const jwt = localStorage.getItem('ws-jwt');
      if (!jwt) {
        return { result: false, candId: '' };
      }
      const participateResult = await participateSpaceById(jwt, spaceInfo.data.space.id, form);
      if (participateResult.data.status === 'ACCEPTED') {
        const spaceType = spaceTypes.get().find((e) => e.id === spaceInfo.data.space.typeId)?.name;
        if (!spaceType) return false;
        curSpace.set(spaceInfo.data.space);
        _enterSpace(spaceInfo.data.space.name);
        unityContext.sendMessage('TeamManager', 'comm_setTeamId', spaceInfo.data.space.id);
        unityContext.sendMessage('WarpManager', 'comm_WarpTo', spaceType);
        return  { result: true, candId: participateResult.data.candId };
      } else {
        return { result: false, candId: participateResult.data.candId  };
      }
    } catch (e) {
      toast.error(t('space.participateRequestFailed'), {
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
      });
      console.log(e);
      return { result: false, candId: '' };
    }
  };

  const [privateModalMode, setPrivateModalMode] = useState(0); // 0: loading, 1: only password, 2: only lobby, 3: both

  const onTryEnterSpace = async (spaceId: string, form: { password: string } = { password: '' }) => {
    setTargetSpaceId(spaceId);
    try {
      const jwt = localStorage.getItem('ws-jwt');
      if (!jwt) {
        return;
      }
      const spaceInfo = await getSpaceById(jwt, spaceId);
      if (spaceInfo.data.space.ownerId !== me.get().wsId && form.password === '' && (spaceInfo.data.space.privateYN || spaceInfo.data.space.lobbyYN)) {
        if (spaceInfo.data.space.privateYN && spaceInfo.data.space.lobbyYN) {
          setPrivateModalMode(3);
        }
        else if (spaceInfo.data.space.lobbyYN) {
          setPrivateModalMode(2);
        }
        else if (spaceInfo.data.space.privateYN) {
          setPrivateModalMode(1);
        }
        else {
          setPrivateModalMode(0);
        }
        setIsPrivateModalOpen(true);
      } else {
        const participateResult: any = await onParticipate(spaceInfo, form);
        if (participateResult.result) console.log('Participate success');
        else console.log('Participate failed!');
      }
    } catch (err) {
      toast.error(t('space.participateRequestFailed'), {
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
      });
    }
  }

  const onTryExitSpace = async () => {
    try {
      const jwt = localStorage.getItem('ws-jwt');
      if (!jwt) {
        return;
      }
      //지울 때 참여 인원 수 확인 로직이 필요
      const decoded: any = jwt_decode(jwt);
      const spaceOwnerId = curSpace.get().ownerId;
      if (decoded.userId === spaceOwnerId && !curSpace.get().isPersonal) {
        const roomDeleteResult = await deleteSpaceById(jwt, curSpace.get().id);
        //sendMessage('MyNetworkManager', 'comm_destroyMediaBoard', curMediaboardNetId.get());
      }
      curSpace.set({});
      curMediaboardNetId.set('');
      unityContext.sendMessage('TeamManager', 'comm_setTeamId', 'vridge_lobby');
      unityContext.sendMessage("WarpManager", "comm_WarpToLobby");
      unityContext.sendMessage("MyNetworkManager", "comm_resetMyProperty");
      _exitSpace();
    } catch (e) {
      toast.error(t('space.destroyFailed'), {
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
      });
      console.log(e);
    }
  }


  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const run = async () => {
      if (location.pathname?.match('^\/spaces\/') && isUnityLoadedHook.get()) {
        const spaceName = location.pathname.slice(8);
        const jwt = localStorage.getItem('ws-jwt');
        if (!jwt) {
          return;
        }
        const spaceInfo = await getSpaceByName(jwt, spaceName);
        if (curSpace.get().id !== spaceInfo.data.space.id) {
          const form = {
            password: '',
          };
          const password = location.search?.match(/pass=([^&]*)/);
          if (password) {
            form.password = password[1];
          }
          await onTryEnterSpace(spaceInfo.data.space.id, form);
        }
      } else if (location.pathname?.match('^\/lobby\/?$') && isUnityLoadedHook.get()) {
        if (curSpace.get().id) {
          await onTryExitSpace();
        }
      }
    };
    run();
  }, [location, isUnityLoadedHook]);

  return <>
    <div className={style.container} style={{ visibility: isUnityLoadedHook.get() ? "visible" : "hidden" }}>
      <div className={style.sidebar_wrapper}>
        <Sidebar unityContext={unityContext} enterSpace={(name: string, form: { password: string } = { password: '' }) => navigate(`/spaces/${name}${form?.password !== '' ? `?pass=${form.password}` : ''}`)} exitSpace={() => navigate(`/lobby`)} />
      </div>
      <div className={style.unity_wrapper}>
        <UnityPlayer unityContext={unityContext} />
      </div>
    </div>

    {!isUnityLoadedHook.get() &&
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '1.5rem',
        textAlign: 'center'
      }}>
        <img src={LoadingGif} alt="loading" />
        <br />
        {unityContext.loadingProgression * 80}%
        <br />
        접속중입니다.
      </div>
    }

    <PrivateModal
      isOpen={isPrivateModalOpen}
      close={() => setIsPrivateModalOpen(false)}
      onCloseParent={() => setIsPrivateModalOpen(false)}
      targetSpaceId={targetSpaceId}
      openMode={privateModalMode}
      onParticipate={onParticipate}
      spaceTypeMap={spaceTypes.get()}
      unityContext={unityContext}
      enterSpace={_enterSpace}
    />

    {lobbyMode && <CandidateToasts spaceId={currentSpaceId} />}
    {isUnityLoadedHook.get() &&
      <>
        <LocalMedia />
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 240,
            left: 240,
            overflowX: 'auto',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          <RemoteList
            presenters={presenters || new Map()}
            participants={conferenceRoomParticipants}
            onClickEach={(participant) => {
              setFocusedUser(participant);
            }}
          />
        </div>
        {app?.me && focusedUser && (
          <FullView
            close={() => setFocusedUser(undefined)}
            setFocusedUser={setFocusedUser}
            me={app.me}
            focusedUser={focusedUser}
            presenters={presenters}
            roomUsers={conferenceRoomParticipants}
          />
        )}
      </>}

    {children || <Outlet />}
  </>
}

export default MainLayout;